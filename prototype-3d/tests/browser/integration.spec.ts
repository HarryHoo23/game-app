import { test, expect } from "@playwright/test";
import { swipe, waitReady, shotResult } from "./helpers";
for (const viewport of [
  { width: 320, height: 568 },
  { width: 400, height: 712 },
  { width: 430, height: 820 },
]) {
  test(`integrated art, unobstructed controls and net timing ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/?automation&mode=practice");
    await waitReady(page);
    const controls = page.locator(".court-controls");
    const box = await controls.boundingBox();
    expect(box!.x).toBeGreaterThan(130);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    await expect(
      page.getByRole("button", { name: "Mute audio", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `docs/verification/integration-2026-10-19/after/ready-${viewport.width}x${viewport.height}.png`,
    });
    const input = await swipe(page, { up: 0.3, touch: true });
    await shotResult(page, input.attempt);
    const s = await page.evaluate(() => window.afterHours3D!.snapshot());
    expect(s.makes).toBe(1);
    const entry = s.rewards.feedback.passages.at(-1)!;
    const swish = s.rewards.feedback.events.find((e) => e.kind === "swish")!;
    expect(entry.at).toBeLessThan(swish.at);
    expect(entry.position.y).toBeGreaterThan(3.05 - 0.12);
    expect(s.rewards.feedback.events.find((e) => e.kind === "net")!.at).toBe(
      entry.at,
    );
    const reward = await page.locator(".feedback.made").boundingBox();
    expect(reward!.x + reward!.width).toBeLessThan(s.width * 0.5 - 4);
    await page.screenshot({
      path: `docs/verification/integration-2026-10-19/after/swish-${viewport.width}x${viewport.height}.png`,
    });
  });
}
test("mute persists across reload and never consumes/intercepts a shot", async ({
  page,
}) => {
  await page.goto("/?automation&mode=practice");
  await waitReady(page);
  await page.getByRole("button", { name: "Mute audio", exact: true }).click();
  expect(
    (await page.evaluate(() => window.afterHours3D!.snapshot())).attempts,
  ).toBe(0);
  await page.reload();
  await waitReady(page);
  await expect(
    page.getByRole("button", { name: "Unmute audio", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const input = await swipe(page, { up: 0.3, touch: true });
  await shotResult(page, input.attempt);
  let s = await page.evaluate(() => window.afterHours3D!.snapshot());
  expect(s.makes).toBe(1);
  expect(s.rewards.audio.played).toBe(0);
  expect(s.rewards.audio.state).toBe("locked");
  await page.getByRole("button", { name: "Unmute audio", exact: true }).click();
  const next = await swipe(page, { up: 0.3, touch: true });
  await shotResult(page, next.attempt);
  s = await page.evaluate(() => window.afterHours3D!.snapshot());
  expect(s.rewards.audio.played).toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Restart practice", exact: true })
    .click();
  await waitReady(page);
  s = await page.evaluate(() => window.afterHours3D!.snapshot());
  expect(s.rewards.audio.voices).toBe(0);
  expect(s.rewards.feedback.passages).toEqual([]);
  expect(s.rewards.netPose.stretch).toBe(0);
});
test("production loads optimized art successfully and does not fetch source PNGs", async ({
  page,
}) => {
  const failed: string[] = [],
    art: string[] = [];
  page.on("response", (r) => {
    if (r.url().includes("/assets/")) {
      if (r.status() >= 400) failed.push(r.url());
      if (r.headers()["content-type"]?.startsWith("image/")) art.push(r.url());
    }
  });
  await page.goto("http://localhost:4174/?mode=practice");
  await page.locator(".loading").waitFor({ state: "detached" });
  await page.mouse.move(200, 620);
  await page.mouse.down();
  await page.mouse.move(200, 406, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByTestId("makes")).toHaveText("1");
  expect(failed).toEqual([]);
  expect(art.length).toBeGreaterThanOrEqual(3);
  expect(art.every((url) => url.endsWith(".webp"))).toBe(true);
});
