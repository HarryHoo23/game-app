import { test, expect } from "@playwright/test";
import { waitReady, swipe, shotResult } from "./helpers";

test("audio stays locked before interaction; real swish animates the net and rewards HUD", async ({
  page,
}) => {
  await page.goto("/?automation");
  await waitReady(page);
  let s = await page.evaluate(() => window.afterHours3D!.snapshot());
  expect(s.rewards.audio.state).toBe("locked");
  expect(s.rewards.audio.played).toBe(0);
  expect(s.rewards.feedback.events).toEqual([]);
  expect(s.rewards.feedback.net).toBeNull();
  await page.screenshot({
    path: "docs/verification/2026-10-19/polish-ready.png",
  });
  await swipe(page, { up: 0.3, touch: true });
  await page.waitForFunction(
    () => window.afterHours3D!.snapshot().rewards.netPose.stretch > 0.02,
  );
  // Entry now precedes confirmation; inspect celebration only after the physical score resolves.
  await shotResult(page, 1);
  s = await page.evaluate(() => window.afterHours3D!.snapshot());
  expect(s.rewards.feedback.events.map((e) => e.kind)).toEqual([
    "release",
    "net",
    "swish",
  ]);
  expect(s.rewards.audio.state).toBe("running");
  expect(s.rewards.audio.played).toBe(3);
  expect(s.rewards.feedback.net!.result).toBe("swish");
  await expect(page.locator(".reward-title")).toHaveText("SWISH");
  await expect(page.getByTestId("makes")).toHaveText("1");
  await page.screenshot({
    path: "docs/verification/2026-10-19/polish-swish.png",
  });
  await page.waitForFunction(
    () => window.afterHours3D!.snapshot().rewards.netPose.stretch === 0,
  );
  const launch = await swipe(page, { up: 0.07, touch: true });
  await shotResult(page, launch.attempt);
  s = await page.evaluate(() => window.afterHours3D!.snapshot());
  expect(
    s.rewards.feedback.events.filter((e) => e.kind === "swish"),
  ).toHaveLength(1);
  expect(s.rewards.feedback.net!.result).toBe("swish"); // miss does not invent a new pulse
  expect(s.rewards.netPose.stretch).toBe(0);
  await page
    .getByRole("button", { name: "Restart practice", exact: true })
    .click();
  await waitReady(page);
  s = await page.evaluate(() => window.afterHours3D!.snapshot());
  expect(s.rewards.feedback.events).toEqual([]);
  expect(s.rewards.feedback.net).toBeNull();
});
test("rim and glass audio correspond to physical contacts; makes react once and pause stops voices", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/?automation");
  for (const up of [0.15, 0.55]) {
    const input = await swipe(page, { up, touch: true });
    const shot = await shotResult(page, input.attempt);
    expect(
      shot.contacts.some(
        (k: { kind: string }) => k.kind === (up === 0.15 ? "rim" : "board"),
      ),
    ).toBe(true);
    const s = await page.evaluate(() => window.afterHours3D!.snapshot());
    const kinds = s.rewards.feedback.events
      .filter((e) => e.shotId === shot.shotId)
      .map((e) => e.kind);
    expect(kinds.filter((k) => k === "release")).toHaveLength(1);
    for (const kind of ["rim", "board"] as const) {
      expect(kinds.includes(kind)).toBe(
        shot.contacts.some((k: { kind: string }) => k.kind === kind),
      );
    }
    expect(kinds.filter((k) => k === "swish" || k === "make")).toHaveLength(
      shot.made ? 1 : 0,
    );
    if (shot.made) expect(s.rewards.feedback.net!.result).toBe(shot.result);
  }
  await page
    .getByRole("button", { name: "Pause practice", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => window.afterHours3D!.snapshot().rewards.audio.voices),
    )
    .toBe(0);
  const before = await page.evaluate(
    () => window.afterHours3D!.snapshot().rewards.netPose,
  );
  await page.waitForTimeout(150);
  expect(
    await page.evaluate(() => window.afterHours3D!.snapshot().rewards.netPose),
  ).toEqual(before);
  await page.screenshot({
    path: "docs/verification/2026-10-19/polish-pause-small.png",
  });
});
