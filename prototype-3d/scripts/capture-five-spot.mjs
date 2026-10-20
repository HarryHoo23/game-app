import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { waitReady, swipe, shotResult } from "./lib/pointer-input.mjs";
import { startFrameRecorder } from "./lib/frame-recorder.mjs";

const out = process.argv[2] ?? "docs/verification/five-spot-2026-10-20/final";
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
  await page.goto("http://localhost:5174/?automation&mode=challenge");
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
        s.spotIndex,
        s.ballInSpot,
        s.best,
        s.rewards.audio.played,
      ]);
      if (key !== signature || s.phase === "changingSpot") {
        signature = key;
        states.push(s);
      }
      await page.waitForTimeout(35);
    }
  })();
  const inputs = [],
    views = [];
  let transitionCaptured = false;
  for (let i = 0; i < 10; i++) {
    const ready = await waitReady(page);
    if (i % 2 === 0) {
      views.push(ready);
      await page.screenshot({ path: `${out}/spot-${ready.spotIndex}.png` });
    }
    const up = i % 2 === 0 ? 0.3 : 0.15;
    const input = await swipe(page, {
      up,
      touch: true,
      duration: 240,
      steps: 12,
    });
    inputs.push(input);
    await shotResult(page, input.attempt);
    if (i === 1) {
      await page.waitForFunction(
        () => window.afterHours3D.snapshot().phase === "changingSpot",
      );
      await page.waitForTimeout(180);
      await page.screenshot({ path: out + "/camera-transition.png" });
      transitionCaptured = true;
    }
  }
  await page.getByRole("region", { name: "Round complete" }).waitFor();
  const resultsAt = await page.evaluate(() => performance.now());
  await page.waitForTimeout(2000);
  const finished = await page.evaluate(() => window.afterHours3D.snapshot());
  const run = await page.evaluate(() => window.afterHours3D.session());
  assert.equal(finished.phase, "completed");
  assert.equal(finished.ready, false);
  assert.equal(finished.attempts, 10);
  assert.equal(finished.makes, 5);
  assert.equal(finished.spotIndex, 4);
  assert.equal(views.length, 5);
  assert.equal(transitionCaptured, true);
  assert.equal(finished.best, 5);
  assert.deepEqual(
    run.shots.map((s) => s.result),
    Array.from({ length: 10 }, (_, i) => (i % 2 ? "rim-miss" : "swish")),
  );
  await page.screenshot({ path: out + "/round-results.png" });
  const retryAt = await page.evaluate(() => performance.now());
  await page.getByRole("button", { name: "PLAY AGAIN", exact: true }).tap();
  const retried = await waitReady(page);
  const retryReadyMs = (await page.evaluate(() => performance.now())) - retryAt;
  assert.equal(retried.sessionId, finished.sessionId + 1);
  assert.equal(retried.attempts, 0);
  assert.equal(retried.makes, 0);
  assert.equal(retried.spotIndex, 0);
  assert.equal(retried.ballInSpot, 0);
  assert.deepEqual(retried.outcomes, Array(10).fill(null));
  assert.equal(retried.best, 5);
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
  execFileSync(ffmpeg, [
    "-loglevel",
    "error",
    "-y",
    "-ss",
    String((resultsAt - origin) / 1000),
    "-i",
    out + "/complete-run.webm",
    "-t",
    String((retryAt - resultsAt) / 1000 + retryReadyMs / 1000 + 0.6),
    "-c:v",
    "vp8",
    "-deadline",
    "realtime",
    "-b:v",
    "1M",
    "-c:a",
    "copy",
    out + "/results-retry.webm",
  ]);
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
        views,
        resultsAtSeconds: (resultsAt - origin) / 1000,
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
    `10-shot run: 5 physical swishes, 5 rim misses; five views; results; native retry ready in ${retryReadyMs.toFixed(0)} ms; physical retry swish; actual audio captured`,
  );
} finally {
  await browser.close();
}
