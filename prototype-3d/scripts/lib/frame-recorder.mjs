import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
const require = createRequire(import.meta.url);
const { registry } = require(
  join(
    dirname(require.resolve("playwright-core/package.json")),
    "lib/server/registry/index.js",
  ),
);
/** Capture the real CSS viewport. Chrome's native screencast can crop tall
 * emulated viewports to its underlying 500×625 surface on this host. */
export async function startFrameRecorder(page, outputFile) {
  const ffmpeg =
    process.env.FFMPEG_PATH ??
    registry.findExecutable("ffmpeg").executablePathOrDie("javascript");
  const fps = 25,
    encoder = spawn(
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
  let errors = "";
  encoder.stderr.on("data", (b) => (errors += b.toString()));
  const closed = once(encoder, "close");
  let running = true,
    frames = 0,
    captures = 0;
  const started = performance.now();
  const loop = (async () => {
    while (running) {
      const buffer = await page.screenshot({
        type: "jpeg",
        quality: 90,
        scale: "css",
      });
      captures++;
      const due = Math.floor(((performance.now() - started) / 1000) * fps);
      while (frames <= due) {
        if (!encoder.stdin.write(buffer)) await once(encoder.stdin, "drain");
        frames++;
      }
      await delay(20);
    }
  })();
  return {
    async stop() {
      running = false;
      await loop;
      encoder.stdin.end();
      const [code] = await closed;
      if (code !== 0) throw new Error(errors || `Encoder exit ${code}`);
      return {
        method:
          "real viewport screenshots paced by wall time; repeated frames where capture is slower than encoding",
        encodedFps: fps,
        captures,
        frames,
        durationSeconds: frames / fps,
      };
    },
  };
}
