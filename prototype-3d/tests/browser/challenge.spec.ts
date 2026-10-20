import { test, expect, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { swipe, waitReady, shotResult, eventListenerCount } from "./helpers";
const output = "docs/verification/calibration-2026-10-20/regression/challenge";
const snap = (page: Page) =>
  page.evaluate(() => window.afterHours3D!.snapshot());
async function aimedTouch(page: Page, up: number, dx = 0) {
  const s = await waitReady(page),
    p = s.ballScreen!,
    client = await page.context().newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: p.x, y: p.y, id: 1 }],
  });
  for (let i = 1; i <= 10; i++) {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: p.x + (dx * s.width * i) / 10,
          y: p.y - (up * s.height * i) / 10,
          id: 1,
        },
      ],
    });
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(35);
  const aiming = await snap(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await client.detach();
  const flight = await snap(page);
  expect(flight.camera.position).toEqual(s.camera.position);
  expect(aiming.shotVisuals!.previewCount).toBeGreaterThan(5);
  const result = await shotResult(page, s.attempts + 1);
  for (const k of ["x", "z"] as const)
    expect(result.viewBasis.right[k]).toBeCloseTo(s.camera.right[k], 8);
  for (const k of ["x", "y", "z"] as const)
    expect(result.launch.velocity[k]).toBeCloseTo(
      aiming.shotVisuals!.previewVelocity![k],
      7,
    );
  return result;
}
for (const viewport of [
  { width: 320, height: 568 },
  { width: 400, height: 712 },
  { width: 430, height: 820 },
]) {
  test(`native ten-ball round, five cameras, outcomes and retry ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await mkdir(output, { recursive: true });
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/?automation");
    const initial = await waitReady(page),
      listeners = await eventListenerCount(page);
    const canvas = await page.locator("canvas").elementHandle();
    const views = [],
      outcomes = [];
    await expect(page.getByRole("note")).toBeVisible();
    for (let i = 0; i < 10; i++) {
      const s = await waitReady(page);
      expect(s.mode).toBe("challenge");
      expect(s.spotIndex).toBe(Math.floor(i / 2));
      expect(s.ballInSpot).toBe(i % 2);
      expect(s.attempts).toBe(i);
      expect(s.ballScreen!.x).toBeCloseTo(viewport.width / 2, 1);
      expect(s.ballScreen!.y).toBeGreaterThan(viewport.height * 0.8);
      expect(s.ballScreen!.y + s.ballScreen!.radius).toBeLessThan(
        viewport.height - 16,
      );
      expect(s.render.geometries).toBeLessThanOrEqual(
        initial.render.geometries + 4,
      );
      expect(s.render.textures).toBeLessThanOrEqual(
        initial.render.textures + 1,
      );
      expect(s.render.artUploads).toBe(initial.render.artUploads);
      expect(s.bodyCount).toBeLessThanOrEqual(3);
      expect(s.worldBodies).toBeLessThanOrEqual(6);
      await expect(page.getByTestId(`shot-marker-${i}`)).toHaveAttribute(
        "data-state",
        "current",
      );
      if (i % 2 === 0) {
        views.push(s);
        const controls = await page.locator(".court-controls").boundingBox();
        expect(controls!.x + controls!.width).toBeLessThanOrEqual(
          viewport.width,
        );
        expect(controls!.y).toBeGreaterThanOrEqual(0);
        await page.screenshot({
          path: `${output}/${viewport.width}-spot-${s.spotIndex}.png`,
        });
      }
      // First three misses must not finish a round; later neutral shots reward reliably.
      const up = i < 3 || i % 2 === 1 ? 0.15 : 0.3;
      const result = await aimedTouch(page, up, i === 6 ? 0.01 : 0);
      outcomes.push(result);
      const after = await snap(page);
      expect(after.outcomes[i]).toBe(result.result);
      expect(after.makes).toBe(outcomes.filter((shot) => shot.made).length);
      expect(after.attempts).toBe(i + 1);
      // Polling can observe the next ready/transition state after the short feedback.
      // Exact resolving gates are checked by the pure controller tests.
      if (i === 9) expect(after.phase).toBe("completed");
      else expect(after.phase).not.toBe("completed");
      if (i === 2) expect(after.makes).toBe(0);
    }
    const finished = await snap(page);
    const results = page.getByRole("region", { name: "Round complete" });
    await expect(results).toBeVisible();
    await expect(results.getByTestId("best")).toHaveText(
      `${finished.makes} / 10`,
    );
    expect(finished.ready).toBe(false);
    expect(finished.attempts).toBe(10);
    expect(finished.outcomes.filter(Boolean)).toHaveLength(10);
    expect(
      new Set(views.map((s) => JSON.stringify(s.camera.position))).size,
    ).toBe(5);
    for (let i = 0; i < 10; i++)
      await expect(results.getByTestId(`shot-marker-${i}`)).toHaveAttribute(
        "data-state",
        outcomes[i].made ? "made" : "missed",
      );
    await page.screenshot({ path: `${output}/${viewport.width}-results.png` });
    await page.waitForTimeout(400);
    expect((await snap(page)).makes).toBe(finished.makes);
    await results.getByRole("button", { name: "PLAY AGAIN" }).tap();
    const retry = await waitReady(page);
    expect(retry).toMatchObject({
      attempts: 0,
      makes: 0,
      spotIndex: 0,
      ballInSpot: 0,
      best: finished.makes,
      bodyCount: 1,
    });
    expect(retry.outcomes).toEqual(Array(10).fill(null));
    expect(retry.sessionId).toBe(finished.sessionId + 1);
    expect(
      await canvas!.evaluate((c) => c === document.querySelector("canvas")),
    ).toBe(true);
    expect(await eventListenerCount(page)).toBe(listeners);
    await page.screenshot({ path: `${output}/${viewport.width}-retry.png` });
    const input = await swipe(page, { up: 0.3, touch: true });
    expect((await shotResult(page, input.attempt)).made).toBe(true);
    await page.reload();
    expect((await waitReady(page)).best).toBe(finished.makes);
    await expect(page.getByRole("note")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Switch to Unlimited Practice" })
      .tap();
    const practice = await waitReady(page);
    expect(practice.mode).toBe("practice");
    expect(practice.origin).toEqual({ x: 0, y: 1.35, z: 4.2 });
    const practiceInput = await swipe(page, { up: 0.3, touch: true });
    expect((await shotResult(page, practiceInput.attempt)).made).toBe(true);
    await page.getByRole("button", { name: "Play Five Spot Challenge" }).tap();
    expect((await waitReady(page)).spotIndex).toBe(0);
    expect(errors).toEqual([]);
    await writeFile(
      `${output}/${viewport.width}-trace.json`,
      JSON.stringify(
        { viewport, initial, views, shots: outcomes, finished, retry, errors },
        null,
        2,
      ),
    );
  });
}

test("moving camera rejects held input, pause freezes transition, and restart returns safely to corner", async ({
  page,
}) => {
  await page.goto("/?automation&mode=challenge");
  await waitReady(page);
  for (let i = 0; i < 2; i++) {
    const input = await swipe(page, { up: 0.3, touch: true });
    await shotResult(page, input.attempt);
  }
  await page.waitForFunction(
    () => window.afterHours3D!.snapshot().phase === "changingSpot",
  );
  const moving = await snap(page),
    p = moving.ballScreen!;
  expect(moving.ready).toBe(false);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x, p.y - 120);
  await page.getByRole("button", { name: "Pause challenge" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  const paused = await snap(page);
  await page.waitForTimeout(500);
  const held = await snap(page);
  expect(held.camera).toEqual(paused.camera);
  expect(held.simTime).toBe(paused.simTime);
  await page.getByRole("button", { name: "Continue shooting" }).focus();
  await page.keyboard.press("Enter");
  const ready = await waitReady(page);
  await page.mouse.up();
  expect(ready.spotIndex).toBe(1);
  expect((await snap(page)).attempts).toBe(2);
  expect(ready.camera.position).not.toEqual(moving.camera.position);
  // The next ball is decorative: a real swipe on it must not consume the active ball.
  await page.mouse.move(
    ready.ballScreen!.x + ready.ballScreen!.radius * 3.5,
    ready.ballScreen!.y,
  );
  await page.mouse.down();
  await page.mouse.move(
    ready.ballScreen!.x + ready.ballScreen!.radius * 3.5,
    ready.ballScreen!.y - 180,
  );
  await page.mouse.up();
  expect((await snap(page)).attempts).toBe(2);
  for (let i = 0; i < 2; i++) {
    const input = await swipe(page, { up: 0.3, touch: true });
    await shotResult(page, input.attempt);
  }
  await page.waitForFunction(
    () => window.afterHours3D!.snapshot().phase === "changingSpot",
  );
  await page.getByRole("button", { name: "Pause challenge" }).tap();
  await page.getByRole("button", { name: "Start fresh" }).tap();
  const restarted = await waitReady(page);
  expect(restarted).toMatchObject({
    spotIndex: 0,
    ballInSpot: 0,
    attempts: 0,
    makes: 0,
    bodyCount: 1,
  });
  await page.waitForTimeout(1000);
  expect((await snap(page)).attempts).toBe(0);
  const input = await swipe(page, { up: 0.3, touch: true });
  expect((await shotResult(page, input.attempt)).made).toBe(true);
});

test("two real rounds keep render and physical resources bounded", async ({
  page,
}) => {
  await page.goto("/?automation&mode=challenge");
  const initial = await waitReady(page);
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < 10; i++) {
      const input = await swipe(page, { up: 0.3, touch: true, duration: 100 });
      await shotResult(page, input.attempt);
      const s = await snap(page);
      expect(s.bodyCount).toBeLessThanOrEqual(3);
      expect(s.worldBodies).toBeLessThanOrEqual(6);
      expect(s.render.geometries).toBeLessThanOrEqual(
        initial.render.geometries + 4,
      );
      expect(s.render.textures).toBeLessThanOrEqual(
        initial.render.textures + 1,
      );
      expect(s.render.artUploads).toBe(initial.render.artUploads);
    }
    await page.getByRole("button", { name: "PLAY AGAIN" }).tap();
    const s = await waitReady(page);
    expect(s.bodyCount).toBe(1);
    expect(s.rewards.feedback.passages).toEqual([]);
    expect(s.rewards.netPose.stretch).toBe(0);
    expect(s.rewards.audio.voices).toBe(0);
  }
});

test("production default challenge completes a native ten-shot round without developer hooks", async ({
  page,
}) => {
  await page.goto("http://localhost:4174/");
  await page.locator(".loading").waitFor({ state: "detached" });
  expect(await page.evaluate(() => typeof window.afterHours3D)).toBe(
    "undefined",
  );
  for (let i = 0; i < 10; i++) {
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
      touchPoints: [{ x: 200, y: 401, id: 1 }],
    });
    await page.waitForTimeout(200);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await client.detach();
    await expect(page.getByTestId("makes")).toHaveText(`${i + 1} / 10`);
  }
  await expect(
    page.getByRole("region", { name: "Round complete" }),
  ).toBeVisible();
  await expect(page.getByText("Session log", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "PLAY AGAIN" }).tap();
  await expect(page.locator("main.game")).toHaveAttribute(
    "data-phase",
    "ready",
  );
  await expect(page.getByTestId("makes")).toHaveText("0 / 10");
});
