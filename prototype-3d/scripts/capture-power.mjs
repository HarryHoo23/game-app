import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { waitReady, swipe, shotResult } from "./lib/pointer-input.mjs";
import assert from "node:assert/strict";

// Real native touch and normal wall-clock flight. Diagnostic hooks are read-only.
const output = "docs/verification/power-2026-10-20/recordings";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const mode of ["practice", "challenge"]) {
    const context = await browser.newContext({
      viewport: { width: 400, height: 712 },
      hasTouch: true,
      recordVideo: {
        dir: "/tmp/after-hours-power-video",
        size: { width: 400, height: 712 },
      },
    });
    const page = await context.newPage(),
      video = page.video(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://localhost:5174/?automation&mode=${mode}`);
    const initial = await waitReady(page),
      shots = [],
      inputs = [];
    const vectors =
      mode === "practice"
        ? [0.06, 0.3, 0.5]
        : [0.06, 0.3, 0.5, 0.3, 0.18, 0.3, 0.46, 0.3, 0.3, 0.5];
    for (const [i, up] of vectors.entries()) {
      await waitReady(page);
      inputs.push(await swipe(page, { up, touch: true, duration: 240 }));
      if (mode === "practice") {
        await page.waitForFunction(() => {
          const s = window.afterHours3D.session().shots.at(-1);
          return s?.samples.at(-1)?.velocity.y < 0.5;
        });
        await page.screenshot({
          path: `${output}/practice-${["light", "normal", "heavy"][i]}-flight.png`,
        });
      }
      shots.push(await shotResult(page, i + 1));
      await page.waitForTimeout(200);
    }
    const finished = await page.evaluate(() => window.afterHours3D.snapshot());
    if (mode === "challenge") {
      assert.equal(finished.phase, "completed");
      assert.equal(finished.attempts, 10);
      await page.screenshot({ path: `${output}/challenge-results.png` });
      await page.getByRole("button", { name: "PLAY AGAIN" }).tap();
      const retry = await waitReady(page);
      assert.equal(retry.attempts, 0);
      assert.equal(retry.makes, 0);
      const input = await swipe(page, { up: 0.3, touch: true });
      assert.equal((await shotResult(page, input.attempt)).made, true);
    }
    assert.deepEqual(errors, []);
    await writeFile(
      `${output}/${mode}-trace.json`,
      JSON.stringify(
        {
          source:
            "native browser touch; no physics, score, storage or clock mutation",
          initial,
          inputs,
          shots,
          finished,
          errors,
        },
        null,
        2,
      ),
    );
    await context.close();
    await video.saveAs(`${output}/${mode}.webm`);
  }
} finally {
  await browser.close();
}
