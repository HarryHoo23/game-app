import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { waitReady, shotResult } from "./helpers";
const output = "docs/verification/calibration-2026-10-20/browser";
const vectors = [
  [0.26, -0.03],
  [0.4, 0.01],
  [0.3, 0.01],
  [0.2, 0],
  [0.34, 0.03],
  [0.38, -0.03],
  [0.22, 0.03],
  [0.32, 0],
  [0.3, -0.01],
  [0.4, 0],
];
test("challenge hides ideal idle shot, shows only an early aim segment, and Practice retains full help", async ({
  page,
}) => {
  await mkdir(output, { recursive: true });
  await page.goto("/?automation");
  const s = await waitReady(page),
    p = s.ballScreen!;
  await expect
    .poll(() =>
      page.evaluate(
        () => window.afterHours3D!.snapshot().shotVisuals?.previewCount,
      ),
    )
    .toBe(0);
  await page.screenshot({ path: `${output}/challenge-idle.png` });
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 10, p.y - s.height * 0.3, { steps: 10 });
  await expect
    .poll(() =>
      page.evaluate(
        () => window.afterHours3D!.snapshot().shotVisuals?.previewCount,
      ),
    )
    .toBe(12);
  const aim = await page.evaluate(
    () => window.afterHours3D!.snapshot().shotVisuals!,
  );
  expect(aim.previewEnd!.y).toBeGreaterThan(3.85);
  expect(aim.previewHit).toBe(false);
  await page.screenshot({ path: `${output}/challenge-aim.png` });
  await page.mouse.up();
  const shot = await shotResult(page, 1);
  expect(shot.launch.velocity).toEqual(aim.previewVelocity);
  await page
    .getByRole("button", { name: "Switch to Unlimited Practice" })
    .tap();
  await waitReady(page);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.afterHours3D!.snapshot().shotVisuals?.previewCount ?? 0,
      ),
    )
    .toBeGreaterThan(20);
  const practice = await page.evaluate(
    () => window.afterHours3D!.snapshot().shotVisuals!,
  );
  expect(practice.previewEnd!.y).toBeLessThan(3.1);
  await page.screenshot({ path: `${output}/practice-idle.png` });
});
for (const preset of ["original", "moderate"]) {
  test(`native A/B round ${preset}: all five angles, partial preview and attributable telemetry`, async ({
    page,
  }) => {
    await mkdir(output, { recursive: true });
    await page.goto(`/?automation&tuning=${preset}`);
    const shots = [];
    for (const [i, [up, dx]] of vectors.entries()) {
      const s = await waitReady(page),
        p = s.ballScreen!;
      expect(s.spotIndex).toBe(Math.floor(i / 2));
      await expect
        .poll(() =>
          page.evaluate(
            () => window.afterHours3D!.snapshot().shotVisuals?.previewCount,
          ),
        )
        .toBe(0);
      if (i % 2 === 0)
        await page.screenshot({
          path: `${output}/${preset}-spot-${s.spotIndex}.png`,
        });
      const client = await page.context().newCDPSession(page);
      await client.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: p.x, y: p.y, id: 1 }],
      });
      for (let n = 1; n <= 10; n++) {
        await client.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            {
              x: p.x + (dx * s.width * n) / 10,
              y: p.y - (up * s.height * n) / 10,
              id: 1,
            },
          ],
        });
        await page.waitForTimeout(20);
      }
      await expect
        .poll(() =>
          page.evaluate(
            () => window.afterHours3D!.snapshot().shotVisuals?.previewCount,
          ),
        )
        .toBe(12);
      const aiming = await page.evaluate(
        () => window.afterHours3D!.snapshot().shotVisuals!,
      );
      await client.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await client.detach();
      const shot = await shotResult(page, i + 1);
      shots.push(shot);
      expect(shot.tuning.preset).toBe(preset);
      expect(shot.spot!.index).toBe(Math.floor(i / 2));
      expect(shot.launch.velocity).toEqual(aiming.previewVelocity);
      expect(
        shot.crossings.filter(
          (c: { stage: string }) => c.stage === "lower-confirmed",
        ),
      ).toHaveLength(shot.made ? 1 : 0);
      expect(shot.gesture.end.x - shot.gesture.start.x).toBeCloseTo(
        dx * s.width,
        3,
      );
      expect(shot.gesture.start.y - shot.gesture.end.y).toBeCloseTo(
        up * s.height,
        3,
      );
    }
    await expect(
      page.getByRole("region", { name: "Round complete" }),
    ).toBeVisible();
    expect(shots.filter((s) => s.made).length).toBe(
      preset === "original" ? 10 : 7,
    );
    await page.screenshot({ path: `${output}/${preset}-results.png` });
    // Verify the actual human export action includes every shot before restart clears it.
    await page.evaluate(() =>
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: async () => {
            throw Error("denied");
          },
        },
      }),
    );
    await page.getByText("Session log", { exact: true }).click();
    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", { name: "Copy session JSON" }).click();
    const file = await downloaded;
    await file.saveAs(`${output}/${preset}-export.json`);
    await writeFile(
      `${output}/${preset}-shots.json`,
      JSON.stringify(shots, null, 2),
    );
  });
}
test("production ignores development tuning URL parameters", async ({
  page,
}) => {
  await page.goto("http://localhost:4174/?tuning=original");
  await page.locator(".loading").waitFor({ state: "detached" });
  await expect(page.locator("main.game")).toHaveAttribute(
    "data-phase",
    "ready",
  );
  const client = await page.context().newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 200, y: 615, id: 1 }],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 200, y: 615 - 712 * 0.5, id: 1 }],
  });
  await page.waitForTimeout(180);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await client.detach();
  await expect(page.getByTestId("shot-marker-0")).toHaveAttribute(
    "data-state",
    "missed",
  );
  await expect(page.getByTestId("makes")).toHaveText("0 / 10");
  expect(await page.evaluate(() => typeof window.afterHours3D)).toBe(
    "undefined",
  );
});
