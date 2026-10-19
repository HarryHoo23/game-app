import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { swipe, waitReady, shotResult } from "./lib/pointer-input.mjs";
import { startFrameRecorder } from "./lib/frame-recorder.mjs";
const out = process.argv[2] ?? "docs/verification/2026-10-19";
await mkdir(`${out}/recordings/raw`, { recursive: true });
await mkdir(`${out}/traces`, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const scenarios = [
  { name: "01-typical-make", ups: [0.28], expected: "swish" },
  { name: "02-clean-swish", ups: [0.3], expected: "swish" },
  { name: "03-front-rim-miss", ups: [0.15], expected: "rim-miss", side: 1 },
  { name: "04-back-rim-miss", ups: [0.45], expected: "rim-miss", side: -1 },
  { name: "05-backboard-contact", ups: [0.55], expected: "board-make" },
  { name: "06-consecutive-attempts", ups: [0.28, 0.07, 0.32, 0.15, 0.55] },
];
const summary = {
  capturedAt: new Date().toISOString(),
  commit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  browser: browser.version(),
  viewport: { width: 400, height: 712 },
  source:
    "automated native touch gestures; real Rapier positions/contacts/scoring, no injected scores or ball transforms",
  scenarios: [],
};
try {
  for (const scenario of scenarios) {
    const context = await browser.newContext({
      viewport: summary.viewport,
      hasTouch: true,
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://localhost:5174/?automation");
    await waitReady(page);
    await page.screenshot({ path: `${out}/${scenario.name}-idle.png` });
    const recorder = await startFrameRecorder(
      page,
      `${out}/recordings/${scenario.name}.webm`,
    );
    const shots = [];
    for (const up of scenario.ups) {
      const input = await swipe(page, {
          up,
          touch: true,
          duration: 240,
          steps: 12,
        }),
        result = await shotResult(page, input.attempt);
      shots.push({ input, ...result });
      await waitReady(page);
    }
    await page.screenshot({ path: `${out}/${scenario.name}-result.png` });
    assert.deepEqual(errors, []);
    if (scenario.expected) assert.equal(shots[0].result, scenario.expected);
    if (scenario.side)
      assert.ok(
        shots[0].contacts.some(
          (k) => k.kind === "rim" && Math.sign(k.position.z) === scenario.side,
        ),
      );
    if (scenario.expected === "swish")
      assert.equal(shots[0].contacts.length, 0);
    if (scenario.expected === "board-make")
      assert.ok(shots[0].contacts.some((k) => k.kind === "board"));
    const final = await page.evaluate(() => window.afterHours3D.snapshot());
    await writeFile(
      `${out}/traces/${scenario.name}.json`,
      JSON.stringify({ scenario, shots, final, errors }, null, 2),
    );
    const recording = await recorder.stop();
    await context.close();
    summary.scenarios.push({
      name: scenario.name,
      shots: shots.map((s) => ({
        normalized: s.launch.normalized,
        velocity: s.launch.velocity,
        result: s.result,
        made: s.made,
        contacts: s.contacts,
      })),
      final,
      recording,
    });
    console.log(scenario.name, shots.map((s) => s.result).join(", "));
  }
} finally {
  await browser.close();
  await writeFile(
    `${out}/recording-summary.json`,
    JSON.stringify(summary, null, 2),
  );
}
