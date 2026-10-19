import { test, expect } from "@playwright/test";
import { waitReady, swipe, shotResult } from "./helpers";

for (const viewport of [
  { width: 320, height: 568 },
  { width: 400, height: 712 },
  { width: 430, height: 820 },
]) {
  test(`Endless starts immediately with non-blocking first swipe help ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/?automation");
    expect((await waitReady(page)).mode).toBe("endless");
    await expect(page.getByRole("note")).toHaveText(
      "Start on the ball.Swipe up and release.",
    );
    const switcher = (await page
      .getByRole("button", { name: "Switch to Unlimited Practice" })
      .boundingBox())!;
    const mute = (await page
      .getByRole("button", { name: "Mute audio", exact: true })
      .boundingBox())!;
    expect(switcher.x + switcher.width).toBeLessThan(mute.x - 4);
    await page.screenshot({
      path: `docs/verification/endless-2026-10-20/ready-${viewport.width}x${viewport.height}.png`,
    });
    const input = await swipe(page, { up: 0.3, touch: true });
    const shot = await shotResult(page, input.attempt);
    expect(shot.result).toBe("swish");
    await expect(page.getByTestId("makes")).toHaveText("1");
    await expect(page.getByTestId("best")).toHaveText("1");
    await expect(page.getByTestId("chances")).toHaveText("3");
    await expect(page.getByRole("note")).toHaveCount(0);
    await page.reload();
    await waitReady(page);
    await expect(page.getByRole("note")).toHaveCount(0);
    await expect(page.getByTestId("best")).toHaveText("1");
  });
}

test("genuine complete Endless run ends after three misses; blocked shots, Retry and reload keep best", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/?automation");
  const initial = await waitReady(page),
    shots = [];
  for (const up of [0.3, 0.15, 0.3, 0.15, 0.15]) {
    const input = await swipe(page, { up, touch: true });
    shots.push(await shotResult(page, input.attempt));
  }
  expect(shots.map((s) => s.result)).toEqual([
    "swish",
    "rim-miss",
    "swish",
    "rim-miss",
    "rim-miss",
  ]);
  const panel = page.getByRole("region", { name: "Game Over" });
  await expect(panel).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible();
  const end = await page.evaluate(() => window.afterHours3D!.snapshot());
  expect(end).toMatchObject({
    mode: "endless",
    phase: "gameover",
    ready: false,
    attempts: 5,
    makes: 2,
    missesLeft: 0,
    best: 2,
  });
  await page.screenshot({
    path: "docs/verification/endless-2026-10-20/game-over.png",
  });
  const cd = await context.newCDPSession(page),
    p = initial.ballScreen!;
  await cd.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: p.x, y: p.y, id: 1 }],
  });
  await cd.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: p.x, y: p.y - 200, id: 1 }],
  });
  await cd.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await cd.detach();
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(() => window.afterHours3D!.snapshot()),
  ).toMatchObject({
    attempts: 5,
    makes: 2,
    missesLeft: 0,
    phase: "gameover",
    ready: false,
  });
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
    "after-hours-endless.json",
  );
  await page.getByText("Session log", { exact: true }).click();
  await panel.getByRole("button", { name: "Retry", exact: true }).tap();
  const retry = await waitReady(page);
  expect(retry).toMatchObject({
    sessionId: end.sessionId + 1,
    attempts: 0,
    makes: 0,
    missesLeft: 3,
    best: 2,
    bodyCount: 1,
  });
  await page.waitForTimeout(1600);
  expect(
    await page.evaluate(() => window.afterHours3D!.snapshot()),
  ).toMatchObject({ attempts: 0, makes: 0, missesLeft: 3 });
  const input = await swipe(page, { up: 0.3, touch: true });
  const after = await shotResult(page, input.attempt);
  expect(after.launch).toEqual(shots[0].launch);
  expect(after.result).toBe("swish");
  await page.reload();
  expect(await waitReady(page)).toMatchObject({
    attempts: 0,
    makes: 0,
    missesLeft: 3,
    best: 2,
    mode: "endless",
  });
});

test("switching modes cancels the old flight; Practice remains unlimited and does not set Endless best", async ({
  page,
}) => {
  await page.goto("/?automation");
  await swipe(page, { up: 0.3, touch: true });
  await page
    .getByRole("button", { name: "Switch to Unlimited Practice" })
    .tap();
  expect(await waitReady(page)).toMatchObject({
    mode: "practice",
    attempts: 0,
    makes: 0,
  });
  await page.waitForTimeout(1600);
  expect(
    await page.evaluate(() => window.afterHours3D!.snapshot()),
  ).toMatchObject({ attempts: 0, makes: 0, best: 0 });
  for (let i = 0; i < 4; i++) {
    const input = await swipe(page, { up: 0.15, touch: true });
    expect((await shotResult(page, input.attempt)).made).toBe(false);
  }
  expect(await waitReady(page)).toMatchObject({
    mode: "practice",
    attempts: 4,
    missesLeft: 3,
    makes: 0,
  });
  await expect(page.getByRole("region", { name: "Game Over" })).toHaveCount(0);
  const input = await swipe(page, { touch: true });
  await shotResult(page, input.attempt);
  expect(
    (await page.evaluate(() => window.afterHours3D!.snapshot())).best,
  ).toBe(0);
  await page.getByRole("button", { name: "Play Endless Hoops" }).tap();
  expect(await waitReady(page)).toMatchObject({
    mode: "endless",
    attempts: 0,
    makes: 0,
    missesLeft: 3,
    best: 0,
  });
  await page.reload();
  expect((await waitReady(page)).mode).toBe("endless");
});

test("Endless native aiming/restart, resize and paused flight preserve the run", async ({
  page,
  context,
}) => {
  await page.goto("/?automation");
  const s = await waitReady(page),
    p = s.ballScreen!,
    cd = await context.newCDPSession(page);
  await cd.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: p.x, y: p.y, id: 1 }],
  });
  await cd.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: p.x, y: p.y - 150, id: 1 }],
  });
  await page.getByRole("button", { name: "Restart Endless run" }).focus();
  await page.keyboard.press("Enter");
  await cd.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await cd.detach();
  expect((await waitReady(page)).attempts).toBe(0);
  const input = await swipe(page, { touch: true });
  await page.getByRole("button", { name: "Pause Endless run" }).tap();
  await expect(
    page.getByRole("dialog", { name: "Endless paused" }),
  ).toBeVisible();
  const paused = await page.evaluate(() => window.afterHours3D!.snapshot());
  await page.setViewportSize({ width: 320, height: 568 });
  await page.waitForTimeout(300);
  expect(
    (await page.evaluate(() => window.afterHours3D!.snapshot())).simTime,
  ).toBe(paused.simTime);
  await page.getByRole("button", { name: "Continue shooting" }).tap();
  expect((await shotResult(page, input.attempt)).made).toBe(true);
  expect(await waitReady(page)).toMatchObject({
    makes: 1,
    missesLeft: 3,
    attempts: 1,
  });
});

test("unavailable local storage keeps a playable run and in-memory best on restart", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("unavailable");
      },
    }),
  );
  await page.goto("/?automation");
  const input = await swipe(page, { touch: true });
  expect((await shotResult(page, input.attempt)).made).toBe(true);
  await page.getByRole("button", { name: "Restart Endless run" }).tap();
  expect(await waitReady(page)).toMatchObject({
    best: 1,
    makes: 0,
    missesLeft: 3,
  });
  await expect(page.getByRole("note")).toHaveCount(0);
});

test("production default is Endless with saved best and reachable Practice", async ({
  page,
}) => {
  await page.goto("http://localhost:4174/");
  await page.locator(".loading").waitFor({ state: "detached" });
  await expect(
    page.getByRole("button", { name: "Switch to Unlimited Practice" }),
  ).toBeVisible();
  await page.mouse.move(200, 620);
  await page.mouse.down();
  await page.mouse.move(200, 406, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByTestId("makes")).toHaveText("1");
  await expect(page.getByTestId("best")).toHaveText("1");
  await page.reload();
  await page.locator(".loading").waitFor({ state: "detached" });
  await expect(page.getByTestId("best")).toHaveText("1");
  await page
    .getByRole("button", { name: "Switch to Unlimited Practice" })
    .tap();
  await expect(page.getByTestId("attempts")).toHaveText("0");
  await expect(
    page.getByRole("button", { name: "Play Endless Hoops" }),
  ).toBeVisible();
  expect(await page.evaluate(() => typeof window.afterHours3D)).toBe(
    "undefined",
  );
});
