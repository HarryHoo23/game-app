import { chromium } from "@playwright/test";
import { readFile, readdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const files = await readdir("dist/assets");
for (const file of files.filter((f) => f.endsWith(".js"))) {
  const code = await readFile(`dist/assets/${file}`, "utf8");
  assert.ok(
    !/__inputDebug|rawStartX|arrivalHorizontalError/.test(code),
    "DEV input telemetry leaked into " + file,
  );
}
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 400, height: 712 } });
  await page.goto("http://localhost:4173/?debug&debugInput");
  await page
    .getByRole("button", { name: "Hit the court", exact: true })
    .click();
  await page.locator("[data-score]").waitFor();
  await page.mouse.move(200, 674);
  await page.mouse.down();
  await page.mouse.move(200, 528, { steps: 12 });
  await page.mouse.up();
  await page.waitForFunction(
    () => document.querySelector("[data-score]").textContent === "4",
  );
  assert.deepEqual(
    await page.evaluate(() => ({
      input: typeof window.__inputDebug,
      game: typeof window.afterHours,
    })),
    { input: "undefined", game: "undefined" },
  );
  await writeFile(
    "docs/input-rim/2026-10-17/production-check.json",
    JSON.stringify(
      {
        builtBundleContainsInputTelemetry: false,
        productionGlobalsAbsent: true,
        productionIdealScore: 4,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS production: telemetry removed from built JS, no debug globals with query flags, real shot scores4.",
  );
} finally {
  await browser.close();
}
