import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { once } from "node:events";
const require = createRequire(import.meta.url);
const { registry } = require(
  join(
    dirname(require.resolve("playwright-core/package.json")),
    "lib/server/registry/index.js",
  ),
);

/** Native Chrome has a minimum 500px surface width and window decorations.
 * Enlarge it to contain the CSS viewport, then remove only unused margins.
 * Buffer real timestamped frames; encode after input stops so encoder pressure
 * cannot skip gameplay time or slow the recorder's sampling loop. */
export async function startViewportRecorder(page, outputFile) {
  const { width, height } = page.viewportSize();
  const client = await page.context().newCDPSession(page);
  const { windowId } = await client.send("Browser.getWindowForTarget");
  await client.send("Browser.setWindowBounds", {
    windowId,
    bounds: { width: Math.max(500, width), height: height + 160 },
  });
  const timeOrigin = await page.evaluate(() => performance.timeOrigin);
  const ffmpeg =
    process.env.FFMPEG_PATH ??
    registry.findExecutable("ffmpeg").executablePathOrDie("javascript");
  const fps = 25,
    buffers = [];
  let captures = 0,
    metadata,
    firstTimestamp,
    previous,
    receiveFirst;
  const first = new Promise((resolve) => (receiveFirst = resolve));
  client.on("Page.screencastFrame", (frame) => {
    void client
      .send("Page.screencastFrameAck", { sessionId: frame.sessionId })
      .catch(() => {});
    const m = frame.metadata;
    if (
      m.deviceWidth < width ||
      m.deviceHeight < height ||
      m.pageScaleFactor !== 1 ||
      m.offsetTop !== 0
    )
      return;
    firstTimestamp ??= m.timestamp;
    const buffer = Buffer.from(frame.data, "base64"),
      due = Math.floor((m.timestamp - firstTimestamp) * fps);
    // A gap repeats the previous observed frame, without changing wall time.
    while (buffers.length < due) buffers.push(previous ?? buffer);
    if (buffers.length === due) buffers.push(buffer);
    previous = buffer;
    metadata = m;
    captures++;
    receiveFirst();
  });
  await client.send("Page.startScreencast", {
    format: "jpeg",
    quality: 90,
    everyNthFrame: 1,
  });
  await first;
  return {
    browserOriginTime: firstTimestamp * 1000 - timeOrigin,
    async screenshot(path) {
      // Playwright screenshot resizes Chrome's underlying native surface. Capture
      // the same current native frame instead, preserving recording dimensions.
      await page.waitForTimeout(60);
      execFileSync(
        ffmpeg,
        [
          "-loglevel",
          "error",
          "-y",
          "-f",
          "image2pipe",
          "-c:v",
          "mjpeg",
          "-i",
          "pipe:0",
          "-vf",
          `crop=${width}:${height}:0:0`,
          "-frames:v",
          "1",
          path,
        ],
        { input: previous },
      );
    },
    async stop() {
      await client.send("Page.stopScreencast");
      await client.detach();
      const encoder = spawn(
        ffmpeg,
        [
          "-loglevel",
          "error",
          "-f",
          "image2pipe",
          "-framerate",
          String(fps),
          "-c:v",
          "mjpeg",
          "-i",
          "pipe:0",
          "-vf",
          `crop=${width}:${height}:0:0`,
          "-y",
          "-an",
          "-c:v",
          "vp8",
          "-crf",
          "8",
          "-deadline",
          "realtime",
          "-b:v",
          "1M",
          outputFile,
        ],
        { stdio: ["pipe", "ignore", "pipe"] },
      );
      encoder.stdin.on("error", () => {});
      let errors = "";
      encoder.stderr.on("data", (b) => (errors += b.toString()));
      const closed = once(encoder, "close");
      for (const buffer of buffers)
        if (!encoder.stdin.write(buffer)) await once(encoder.stdin, "drain");
      encoder.stdin.end();
      const [code] = await closed;
      if (code !== 0) throw new Error(errors || `Encoder exit ${code}`);
      return {
        method:
          "actual native Chrome frames sampled using original compositor timestamps; unscaled crop of unused margins to complete CSS viewport; encoded offline without altering game clocks",
        encodedFps: fps,
        captures,
        frames: buffers.length,
        durationSeconds: buffers.length / fps,
        observedDurationSeconds: metadata.timestamp - firstTimestamp,
        sourceSurface: {
          width: metadata.deviceWidth,
          height: metadata.deviceHeight,
          pageScaleFactor: metadata.pageScaleFactor,
        },
        viewportCrop: { x: 0, y: 0, width, height },
      };
    },
  };
}
