import { chromium } from "@playwright/test";
import { mkdir, writeFile, readFile, rm, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { swipe, waitReady, shotResult } from "./lib/pointer-input.mjs";
import { startFrameRecorder } from "./lib/frame-recorder.mjs";
const out = process.argv[2] ?? "docs/verification/integration-2026-10-19/after";
await mkdir(out + "/recordings", { recursive: true });
await mkdir(out + "/traces", { recursive: true });
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
const browser = await chromium.launch({ channel: "chrome", headless: true });
const sourceHashes = {};
async function hashSources(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = path + "/" + entry.name;
    if (entry.isDirectory()) await hashSources(file);
    else
      sourceHashes[file] = createHash("sha256")
        .update(await readFile(file))
        .digest("hex");
  }
}
await hashSources("src");
const summary = {
  sourceHashes,
  startingHead: "409732cacce6043df18ff8d4fa6fad925384ca63",
  capturedHead: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  workingTree: execFileSync("git", ["diff", "--stat"], { encoding: "utf8" }),
  source:
    "native touch only; no score, body or clock injection; Web Audio tapped only for recording",
  scenarios: [],
};
try {
  for (const scenario of [
    { name: "clean-swish", up: 0.3, result: "swish" },
    { name: "rim-miss", up: 0.15, result: "rim-miss" },
    { name: "board-contact", up: 0.55, result: "board-make" },
  ]) {
    const context = await browser.newContext({
      viewport: { width: 400, height: 712 },
      hasTouch: true,
    });
    // Route a second copy of the existing master output into a recorder. No game events are generated here.
    await context.addInitScript(() => {
      const Original = window.AudioContext;
      window.__recordedAudio = { chunks: [], start: 0, recorder: null };
      window.AudioContext = class extends Original {
        constructor(...args) {
          super(...args);
          const ctx = this,
            original = ctx.createGain.bind(ctx);
          ctx.createGain = function () {
            const gain = original(),
              connect = gain.connect.bind(gain);
            gain.connect = function (destination, ...rest) {
              const result = connect(destination, ...rest);
              if (
                destination === ctx.destination &&
                !window.__recordedAudio.recorder
              ) {
                const tap = ctx.createMediaStreamDestination();
                connect(tap);
                const state = window.__recordedAudio;
                state.recorder = new MediaRecorder(tap.stream, {
                  mimeType: "audio/webm;codecs=opus",
                });
                state.recorder.ondataavailable = (e) =>
                  state.chunks.push(e.data);
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
    await page.goto("http://localhost:5174/?automation");
    await waitReady(page);
    await page.screenshot({ path: out + "/" + scenario.name + "-ready.png" });
    const origin = await page.evaluate(() => performance.now());
    const video = await startFrameRecorder(
      page,
      out + "/recordings/" + scenario.name + "-silent.webm",
    );
    const observations = [];
    let observe = true;
    const monitor = (async () => {
      while (observe) {
        observations.push(
          await page.evaluate(() => window.afterHours3D.snapshot()),
        );
        await page.waitForTimeout(12);
      }
    })();
    const input = await swipe(page, {
      up: scenario.up,
      touch: true,
      duration: 240,
      steps: 12,
    });
    const shot = await shotResult(page, input.attempt);
    await page.waitForTimeout(450);
    observe = false;
    await monitor;
    await page.screenshot({ path: out + "/" + scenario.name + "-result.png" });
    const recording = await video.stop();
    const audio = await page.evaluate(async () => {
      const s = window.__recordedAudio;
      if (!s.recorder) return null;
      await new Promise((resolve) => {
        s.recorder.onstop = resolve;
        s.recorder.stop();
      });
      const blob = new Blob(s.chunks, { type: "audio/webm" }),
        buffer = await blob.arrayBuffer();
      let binary = "";
      for (const b of new Uint8Array(buffer)) binary += String.fromCharCode(b);
      return { data: btoa(binary), start: s.start };
    });
    assert.equal(shot.result, scenario.result);
    assert.deepEqual(errors, []);
    if (scenario.result === "swish") assert.equal(shot.contacts.length, 0);
    const rewards = observations.at(-1).rewards;
    const trace = {
      scenario,
      input,
      shot,
      rewards,
      observations,
      recording,
      audioOffsetSeconds: audio ? (audio.start - origin) / 1000 : null,
      errors,
    };
    if (audio) {
      const audioFile = out + "/recordings/" + scenario.name + "-audio.webm";
      await writeFile(audioFile, Buffer.from(audio.data, "base64"));
      execFileSync(ffmpeg, [
        "-loglevel",
        "error",
        "-y",
        "-i",
        out + "/recordings/" + scenario.name + "-silent.webm",
        "-itsoffset",
        String(Math.max(0, trace.audioOffsetSeconds)),
        "-i",
        audioFile,
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c",
        "copy",
        out + "/recordings/" + scenario.name + ".webm",
      ]);
      await rm(audioFile);
      await rm(out + "/recordings/" + scenario.name + "-silent.webm");
    }
    await writeFile(
      out + "/traces/" + scenario.name + ".json",
      JSON.stringify(trace, null, 2),
    );
    summary.scenarios.push({
      name: scenario.name,
      result: shot.result,
      recording,
      audio: !!audio,
      rewards,
    });
    console.log(scenario.name, shot.result, "audio", !!audio);
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(
    out + "/recording-summary.json",
    JSON.stringify(summary, null, 2),
  );
}
// Compare accepted launch and actual physical outcome to the preserved baseline.
const comparison = [];
for (const [current, baseline] of [
  ["clean-swish", "02-clean-swish"],
  ["rim-miss", "03-front-rim-miss"],
  ["board-contact", "05-backboard-contact"],
]) {
  const before = JSON.parse(
    await readFile(
      out.replace(/after\/?$/, "before") + "/traces/" + baseline + ".json",
      "utf8",
    ),
  );
  const after = JSON.parse(
    await readFile(out + "/traces/" + current + ".json", "utf8"),
  );
  const a = before.shots[0],
    b = after.shot;
  assert.deepEqual(b.launch.velocity, a.launch.velocity);
  assert.equal(b.result, a.result);
  const matched = a.samples.flatMap((before) =>
    b.samples
      .filter((after) => Math.abs(before.time - after.time) < 1e-6)
      .map((after) => [before, after]),
  );
  const maximumPositionDeviation = Math.max(
    ...matched.map(([before, after]) =>
      Math.hypot(
        ...["x", "y", "z"].map((k) => before.position[k] - after.position[k]),
      ),
    ),
  );
  assert.ok(maximumPositionDeviation < 1e-6);
  comparison.push({
    case: current,
    matchedPhysicalSamples: matched.length,
    maximumPositionDeviationMetres: maximumPositionDeviation,
    velocityUnchanged: true,
    resultUnchanged: true,
    velocity: b.launch.velocity,
    result: b.result,
    beforeContacts: a.contacts.map((c) => c.kind),
    afterContacts: b.contacts.map((c) => c.kind),
  });
}
await writeFile(
  out + "/physical-comparison.json",
  JSON.stringify(comparison, null, 2),
);
