import { chromium } from "@playwright/test";
import { readFile, readdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
for (const file of (await readdir("dist/assets")).filter((f) =>
  f.endsWith(".js"),
)) {
  const js = await readFile(`dist/assets/${file}`, "utf8");
  assert.ok(
    !/__physicsAudit|PHYSICS AUDIT|height-gate|collision-gate|sourceSolidRadius/.test(
      js,
    ),
    "physics diagnostics shipped in " + file,
  );
}
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const p = await browser.newPage({ viewport: { width: 400, height: 712 } });
  await p.goto("http://localhost:4173/?debug&debugPhysics");
  await p.getByRole("button", { name: "Hit the court", exact: true }).click();
  await p.locator("[data-score]").waitFor();
  await p.mouse.move(200, 674);
  await p.mouse.down();
  await p.mouse.move(200, 534, { steps: 12 });
  await p.mouse.up();
  await p.waitForFunction(
    () => document.querySelector("[data-score]").textContent === "3",
  );
  assert.deepEqual(
    await p.evaluate(() => ({
      audit: typeof window.__physicsAudit,
      game: typeof window.afterHours,
    })),
    { audit: "undefined", game: "undefined" },
  );
  await writeFile(
    "docs/physics-audit/2026-10-18/production-check.json",
    JSON.stringify(
      {
        diagnosticsAbsentFromBuiltJavaScript: true,
        queryFlagsCannotExposeDiagnostics: true,
        actualProductionSwishScore: 3,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS production: no diagnostic code/strings/globals despite flags; actual input swish+3.",
  );
} finally {
  await browser.close();
}
