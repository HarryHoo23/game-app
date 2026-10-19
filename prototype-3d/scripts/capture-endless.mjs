import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { waitReady, swipe, shotResult } from "./lib/pointer-input.mjs";
import { startFrameRecorder } from "./lib/frame-recorder.mjs";

const out = process.argv[2] ?? "docs/verification/endless-2026-10-20";
await mkdir(out, { recursive: true });
const require = createRequire(import.meta.url);
const { registry } = require(
  join(
    dirname(require.resolve("playwright-core/package.json")),
    "lib/server/registry/index.js",
  ),
);
const ffmpeg = registry
  .findExecutable("ffmpeg")
  .executablePathOrDie("javascript");
const sourceHashes = {};
async function hashSources(path) {
  for (const e of await readdir(path, { withFileTypes: true })) {
    const file = `${path}/${e.name}`;
    if (e.isDirectory()) await hashSources(file);
    else
      sourceHashes[file] = createHash("sha256")
        .update(await readFile(file))
        .digest("hex");
  }
}
await hashSources("src");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 400, height: 712 },
    hasTouch: true,
  });
  // Copy only the real master audio output, exactly as in capture-integration.
  // No score, body, clock, run or storage state is injected.
  await context.addInitScript(() => {
    const Original = window.AudioContext;
    window.__recordedAudio = { chunks: [], start: 0, recorder: null };
    window.AudioContext = class extends Original {
      constructor(...args) {
        super(...args);
        const original = this.createGain.bind(this),
          ctx = this;
        this.createGain = function () {
          const gain = original(),
            connect = gain.connect.bind(gain);
          gain.connect = function (destination, ...rest) {
            const result = connect(destination, ...rest),
              state = window.__recordedAudio;
            if (destination === ctx.destination && !state.recorder) {
              const tap = ctx.createMediaStreamDestination();
              connect(tap);
              state.recorder = new MediaRecorder(tap.stream, {
                mimeType: "audio/webm;codecs=opus",
              });
              state.recorder.ondataavailable = (e) => state.chunks.push(e.data);
              state.start = performance.now();
              state.recorder.start();
            }
            return result;
          };
          return gain;
        };
      }
    };
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:5174/?automation&mode=endless");
  const initial = await waitReady(page);
  await page.screenshot({ path: out + "/run-ready.png" });
  const origin = await page.evaluate(() => performance.now());
  const video = await startFrameRecorder(
    page,
    out + "/complete-run-silent.webm",
  );
  const states = [];
  let observing = true,
    signature = "";
  const monitor = (async () => {
    while (observing) {
      const s = await page.evaluate(() => ({
        wallTime: performance.now(),
        ...window.afterHours3D.snapshot(),
      }));
      const key = JSON.stringify([
        s.sessionId,
        s.phase,
        s.ready,
        s.attempts,
        s.makes,
        s.missesLeft,
        s.best,
        s.rewards.audio.played,
      ]);
      if (key !== signature) {
        signature = key;
        states.push(s);
      }
      await page.waitForTimeout(35);
    }
  })();
  const inputs = [];
  for (const up of [0.3, 0.15, 0.3, 0.15, 0.15]) {
    const input = await swipe(page, {
      up,
      touch: true,
      duration: 240,
      steps: 12,
    });
    inputs.push(input);
    await shotResult(page, input.attempt);
  }
  await page.getByRole("region", { name: "Game Over" }).waitFor();
  await page.waitForTimeout(700);
  const finished = await page.evaluate(() => window.afterHours3D.snapshot());
  const run = await page.evaluate(() => window.afterHours3D.session());
  assert.equal(finished.phase, "gameover");
  assert.equal(finished.ready, false);
  assert.equal(finished.attempts, 5);
  assert.equal(finished.makes, 2);
  assert.equal(finished.missesLeft, 0);
  assert.equal(finished.best, 2);
  assert.deepEqual(
    run.shots.map((s) => s.result),
    ["swish", "rim-miss", "swish", "rim-miss", "rim-miss"],
  );
  await page.screenshot({ path: out + "/run-game-over.png" });
  const retryAt = await page.evaluate(() => performance.now());
  await page.getByRole("button", { name: "Retry", exact: true }).tap();
  const retried = await waitReady(page);
  const retryReadyMs = (await page.evaluate(() => performance.now())) - retryAt;
  assert.equal(retried.sessionId, finished.sessionId + 1);
  assert.equal(retried.attempts, 0);
  assert.equal(retried.makes, 0);
  assert.equal(retried.missesLeft, 3);
  assert.equal(retried.best, 2);
  assert.equal(retried.bodyCount, 1);
  assert.equal(retried.render.artUploads, initial.render.artUploads);
  await page.screenshot({ path: out + "/run-retry-ready.png" });
  const next = await swipe(page, {
    up: 0.3,
    touch: true,
    duration: 240,
    steps: 12,
  });
  const retryShot = await shotResult(page, next.attempt);
  assert.equal(retryShot.result, "swish");
  await page.waitForTimeout(450);
  await page.screenshot({ path: out + "/run-retry-make.png" });
  const retrySession = await page.evaluate(() => window.afterHours3D.session());
  observing = false;
  await monitor;
  const recording = await video.stop();
  const audio = await page.evaluate(async () => {
    const s = window.__recordedAudio;
    if (!s.recorder) throw new Error("Missing actual game audio");
    await new Promise((resolve) => {
      s.recorder.onstop = resolve;
      s.recorder.stop();
    });
    const buffer = await new Blob(s.chunks, {
      type: "audio/webm",
    }).arrayBuffer();
    let binary = "";
    for (const b of new Uint8Array(buffer)) binary += String.fromCharCode(b);
    return { data: btoa(binary), start: s.start };
  });
  const audioFile = out + "/complete-run-audio.webm";
  await writeFile(audioFile, Buffer.from(audio.data, "base64"));
  const audioOffsetSeconds = Math.max(0, (audio.start - origin) / 1000);
  execFileSync(ffmpeg, [
    "-loglevel",
    "error",
    "-y",
    "-i",
    out + "/complete-run-silent.webm",
    "-itsoffset",
    String(audioOffsetSeconds),
    "-i",
    audioFile,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c",
    "copy",
    out + "/complete-run.webm",
  ]);
  await rm(audioFile);
  await rm(out + "/complete-run-silent.webm");
  assert.deepEqual(errors, []);
  const baseline = JSON.parse(
    await readFile(
      "docs/verification/acceptance-2026-10-19/after/traces/clean-swish.json",
      "utf8",
    ),
  ).shot;
  const shot = run.shots[0];
  assert.deepEqual(shot.launch, baseline.launch);
  assert.equal(shot.result, baseline.result);
  const matched = baseline.samples.flatMap((a) =>
    shot.samples
      .filter((b) => Math.abs(a.time - b.time) < 1e-6)
      .map((b) => [a, b]),
  );
  const maximumPositionDeviationMetres = Math.max(
    ...matched.map(([a, b]) =>
      Math.hypot(...["x", "y", "z"].map((k) => a.position[k] - b.position[k])),
    ),
  );
  assert.ok(matched.length > 0 && maximumPositionDeviationMetres < 1e-6);
  await writeFile(
    out + "/run-trace.json",
    JSON.stringify(
      {
        source:
          "native touch; actual physics; read-only observations; copied game audio",
        inputs,
        initial,
        finished,
        retried,
        retryReadyMs,
        run,
        retrySession,
        states,
        recording,
        audioOffsetSeconds,
        comparison: {
          baselineHead: "969922972edd0a5d2a608b6a2502695d9272c2e8",
          matchedSamples: matched.length,
          maximumPositionDeviationMetres,
          launchUnchanged: true,
          outcomeUnchanged: true,
        },
        errors,
      },
      null,
      2,
    ),
  );
  await writeFile(
    out + "/recording-manifest.json",
    JSON.stringify(
      {
        capturedHead: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        workingTree: execFileSync("git", ["diff", "--stat"], {
          encoding: "utf8",
        }),
        sourceHashes,
      },
      null,
      2,
    ),
  );
  console.log(
    `5-shot run: 2 makes, 3 misses; Game Over; native Retry ready in ${retryReadyMs.toFixed(0)} ms; physical retry swish; audio captured; ${matched.length} baseline samples, deviation ${maximumPositionDeviationMetres}`,
  );
} finally {
  await browser.close();
}
