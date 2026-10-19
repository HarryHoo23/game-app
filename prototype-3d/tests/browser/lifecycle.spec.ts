import { test, expect } from "@playwright/test";
import { swipe, waitReady, shotResult, eventListenerCount } from "./helpers";
for (const transition of ["restart", "pause"] as const) {
  test(`held drag is cancelled across ${transition}`, async ({ page }) => {
    await page.goto("/?automation&mode=practice");
    const s = await waitReady(page),
      p = s.ballScreen;
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.move(p.x, p.y - s.height * 0.3);
    const control = page.getByRole("button", {
      name: transition === "restart" ? "Restart practice" : "Pause practice",
      exact: true,
    });
    await control.focus();
    await page.keyboard.press("Enter");
    if (transition === "pause") {
      await page.getByRole("button", { name: "Continue shooting" }).focus();
      await page.keyboard.press("Enter");
    }
    await waitReady(page);
    await page.mouse.up();
    await page.waitForTimeout(100);
    const after = await page.evaluate(() => window.afterHours3D!.snapshot());
    expect(after.attempts).toBe(0);
    expect(after.phase).toBe("ready");
  });
}
test("30 consecutive shots and rapid retries keep bodies and listeners bounded", async ({
  page,
}) => {
  await page.goto("/?automation&mode=practice");
  const initial = await waitReady(page);
  const listeners = await eventListenerCount(page),
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (let i = 0; i < 30; i++) {
    const input = await swipe(page, {
      up: i % 5 === 0 ? 0.07 : 0.26 + (i % 4) * 0.025,
      dx: i % 3 === 0 ? 0.025 : 0,
      duration: 100,
    });
    await shotResult(page, input.attempt);
    const s = await page.evaluate(() => window.afterHours3D!.snapshot());
    expect(s.bodyCount).toBeLessThanOrEqual(3);
    expect(s.worldBodies).toBeLessThanOrEqual(6);
    expect(s.render.geometries).toBeLessThanOrEqual(
      initial.render.geometries + 4,
    );
    expect(s.render.textures).toBeLessThanOrEqual(initial.render.textures + 1);
    expect(s.render.artUploads).toBe(initial.render.artUploads);
  }
  await waitReady(page);
  expect(
    (await page.evaluate(() => window.afterHours3D!.snapshot())).attempts,
  ).toBe(30);
  await page
    .getByRole("button", { name: "Restart practice", exact: true })
    .click({ clickCount: 3 });
  await waitReady(page);
  let s = await page.evaluate(() => window.afterHours3D!.snapshot());
  expect(s.attempts).toBe(0);
  expect(s.makes).toBe(0);
  expect(s.bodyCount).toBe(1);
  const input = await swipe(page, { up: 0.3 });
  await page
    .getByRole("button", { name: "Restart practice", exact: true })
    .click();
  await waitReady(page);
  await page.waitForTimeout(1600);
  s = await page.evaluate(() => window.afterHours3D!.snapshot());
  expect(s.attempts).toBe(0);
  expect(s.makes).toBe(0);
  expect(input.attempt).toBe(1);
  expect(await eventListenerCount(page)).toBe(listeners);
  expect(errors).toEqual([]);
});
test("resize cancels aiming and preserves released physics", async ({
  page,
}) => {
  await page.goto("/?automation&mode=practice");
  const s = await waitReady(page),
    p = s.ballScreen;
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x, p.y - 100);
  await page.setViewportSize({ width: 430, height: 820 });
  await page.mouse.up();
  expect(
    (await page.evaluate(() => window.afterHours3D!.snapshot())).attempts,
  ).toBe(0);
  await swipe(page, { up: 0.3 });
  const a = await page.evaluate(() => window.afterHours3D!.snapshot());
  await page.setViewportSize({ width: 320, height: 568 });
  const b = await page.evaluate(() => window.afterHours3D!.snapshot());
  expect(b.active!.velocity.x).toBeCloseTo(a.active!.velocity.x, 5);
  expect(b.active!.velocity.z).toBeCloseTo(a.active!.velocity.z, 5);
  await shotResult(page, 1);
});
test("native touch cancellation and extra touches do not add shots", async ({
  page,
  context,
}) => {
  await page.goto("/?automation&mode=practice");
  const s = await waitReady(page),
    p = s.ballScreen;
  const cd = await context.newCDPSession(page);
  const first = { x: p.x, y: p.y, id: 1 },
    second = { x: p.x + 20, y: p.y, id: 2 };
  await cd.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [first],
  });
  await cd.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [first, second],
  });
  await cd.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  expect(
    (await page.evaluate(() => window.afterHours3D!.snapshot())).attempts,
  ).toBe(0);
  await cd.detach();
  const input = await swipe(page, { up: 0.3, touch: true });
  expect((await shotResult(page, input.attempt)).made).toBe(true);
});
test("pause and simulated background visibility suspend physical time until explicit resume", async ({
  page,
}) => {
  await page.goto("/?automation&mode=practice");
  await swipe(page, { up: 0.3 });
  await page.getByRole("button", { name: "Pause practice" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const a = await page.evaluate(() => window.afterHours3D!.snapshot());
  await page.waitForTimeout(500);
  const b = await page.evaluate(() => window.afterHours3D!.snapshot());
  expect(b.simTime).toBe(a.simTime);
  expect(b.active!.position).toEqual(a.active!.position);
  await page.getByRole("button", { name: "Continue shooting" }).click();
  await shotResult(page, 1);
  await waitReady(page);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("dialog")).toBeVisible();
  const before = await page.evaluate(
    () => window.afterHours3D!.snapshot().simTime,
  );
  await page.waitForTimeout(400);
  expect(
    await page.evaluate(() => window.afterHours3D!.snapshot().simTime),
  ).toBe(before);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Continue shooting" }).click();
  await waitReady(page);
});
test("clipboard denial provides a JSON download", async ({ page }) => {
  await page.goto("/?automation&mode=practice");
  await waitReady(page);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
    }),
  );
  await page.getByText("Session log", { exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Copy session JSON" }).click();
  expect((await downloaded).suggestedFilename()).toBe(
    "after-hours-practice.json",
  );
});
