import { test, expect } from "@playwright/test";
import { swipe, waitReady, shotResult } from "./helpers";
for (const viewport of [
  { width: 320, height: 568 },
  { width: 400, height: 712 },
  { width: 430, height: 820 },
  { width: 1280, height: 800 },
]) {
  test(`portrait composition and physical make ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/?automation");
    const s = await waitReady(page);
    for (const p of Object.values(s.projection) as { x: number; y: number }[]) {
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(s.width);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(s.height);
    }
    expect(s.ballScreen.y + s.ballScreen.radius).toBeLessThan(s.height);
    const input = await swipe(page, {
      up: 0.3,
      touch: viewport.width !== 1280,
    });
    const result = await shotResult(page, input.attempt);
    expect(result.result).toBe("swish");
    expect(result.contacts).toHaveLength(0);
    expect(result.crossings.at(-1).stage).toBe("lower-confirmed");
    await expect(page.getByTestId("makes")).toHaveText("1");
    expect(errors).toEqual([]);
    await page.screenshot({
      path: `docs/verification/2026-10-19/viewport-${viewport.width}x${viewport.height}.png`,
    });
  });
}
test("actual pointer inputs yield readable physical misses and board contact", async ({
  page,
}) => {
  await page.goto("/?automation");
  await waitReady(page);
  for (const [up, dx, expected] of [
    [0.07, 0, "short"],
    [0.3, -0.3, "left"],
    [0.3, 0.3, "right"],
    [0.15, 0, "rim-miss"],
    [0.45, 0, "rim-miss"],
    [0.55, 0, "board-make"],
  ] as const) {
    const input = await swipe(page, { up, dx });
    const result = await shotResult(page, input.attempt);
    expect(result.result).toBe(expected);
    if (expected.includes("rim"))
      expect(
        result.contacts.some((k: { kind: string }) => k.kind === "rim"),
      ).toBe(true);
    if (expected.includes("board"))
      expect(
        result.contacts.some((k: { kind: string }) => k.kind === "board"),
      ).toBe(true);
  }
});
test("mouse move event count does not change the launched velocity", async ({
  page,
}) => {
  await page.goto("/?automation");
  const velocities = [];
  for (const steps of [1, 5, 50]) {
    const input = await swipe(page, {
      up: 0.31,
      dx: 0.02,
      steps,
      duration: 180,
    });
    const r = await shotResult(page, input.attempt);
    velocities.push(r.launch.velocity);
  }
  expect(velocities[1]).toEqual(velocities[0]);
  expect(velocities[2]).toEqual(velocities[0]);
});
