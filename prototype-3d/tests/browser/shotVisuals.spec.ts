import { test, expect } from "@playwright/test";
import { waitReady, shotResult } from "./helpers";
test("prepared arc follows the swipe, becomes a real trail, and clears on restart", async ({
  page,
}) => {
  await page.goto("/?automation&mode=practice");
  const s = await waitReady(page),
    p = s.ballScreen;
  await expect
    .poll(() =>
      page.evaluate(
        () => window.afterHours3D!.snapshot().shotVisuals?.previewCount ?? 0,
      ),
    )
    .toBeGreaterThan(10);
  await page.screenshot({
    path: "docs/verification/2026-10-19/trajectory-ready.png",
  });
  const baseline = await page.evaluate(
    () => window.afterHours3D!.snapshot().shotVisuals!,
  );
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 40, p.y - s.height * 0.42, { steps: 12 });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.afterHours3D!.snapshot().shotVisuals?.previewVelocity?.x ?? 0,
      ),
    )
    .toBeGreaterThan(0.05);
  const aim = await page.evaluate(
    () => window.afterHours3D!.snapshot().shotVisuals!,
  );
  expect(aim.previewVelocity!.z).toBeLessThan(baseline.previewVelocity!.z);
  await page.screenshot({
    path: "docs/verification/2026-10-19/trajectory-aiming.png",
  });
  await page.mouse.up();
  await expect
    .poll(() =>
      page.evaluate(
        () => window.afterHours3D!.snapshot().shotVisuals?.trailCount ?? 0,
      ),
    )
    .toBeGreaterThan(3);
  const flight = await page.evaluate(
    () => window.afterHours3D!.snapshot().shotVisuals!,
  );
  expect(flight.previewCount).toBe(0);
  await page.screenshot({
    path: "docs/verification/2026-10-19/trajectory-flight.png",
  });
  const shot = await shotResult(page, 1);
  expect(shot.launch.velocity.x).toBeCloseTo(aim.previewVelocity!.x, 7);
  expect(shot.launch.velocity.z).toBeCloseTo(aim.previewVelocity!.z, 7);
  await page
    .getByRole("button", { name: "Restart practice", exact: true })
    .click();
  await waitReady(page);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.afterHours3D!.snapshot().shotVisuals?.trailCount ?? -1,
      ),
    )
    .toBe(0);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.afterHours3D!.snapshot().shotVisuals?.previewCount ?? 0,
      ),
    )
    .toBeGreaterThan(10);
});
test("cancelled aim and paused preview return to the baseline without consuming shots", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/?automation&mode=practice");
  const s = await waitReady(page),
    p = s.ballScreen;
  const client = await context.newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: p.x, y: p.y, id: 1 }],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: p.x + 50, y: p.y - s.height * 0.5, id: 1 }],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await client.detach();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.afterHours3D!.snapshot().shotVisuals?.previewVelocity?.x ??
          100,
      ),
    )
    .toBe(0);
  expect(
    (await page.evaluate(() => window.afterHours3D!.snapshot())).attempts,
  ).toBe(0);
  await page
    .getByRole("button", { name: "Pause practice", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () => window.afterHours3D!.snapshot().shotVisuals?.previewCount ?? -1,
      ),
    )
    .toBe(0);
  await page.getByRole("button", { name: "Continue shooting" }).click();
  await waitReady(page);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.afterHours3D!.snapshot().shotVisuals?.previewCount ?? 0,
      ),
    )
    .toBeGreaterThan(10);
});
