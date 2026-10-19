import { test, expect } from "@playwright/test";
import { swipe, waitReady, shotResult } from "./helpers";

test("small portrait HUD responds to native taps near its inside edges", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/?automation&mode=practice");
  await waitReady(page);
  for (const name of ["Mute audio", "Unmute audio", "Pause practice"]) {
    const button = page.getByRole("button", { name, exact: true });
    // Check the base target size; touch :active can begin between two layout
    // reads. Tap inside the actual transformed bounds, including while pressed.
    await expect(button).toHaveCSS("width", "36px");
    await expect(button).toHaveCSS("height", "36px");
    const box = (await button.boundingBox())!;
    await page.touchscreen.tap(box.x + 3, box.y + box.height / 2);
    if (name === "Mute audio")
      await expect(
        page.getByRole("button", { name: "Unmute audio", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
    if (name === "Unmute audio")
      await expect(
        page.getByRole("button", { name: "Mute audio", exact: true }),
      ).toHaveAttribute("aria-pressed", "false");
  }
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Continue shooting" }).tap();
  await waitReady(page);
  expect(
    (await page.evaluate(() => window.afterHours3D!.snapshot())).attempts,
  ).toBe(0);
  const input = await swipe(page, { touch: true });
  expect((await shotResult(page, input.attempt)).made).toBe(true);
  await page
    .getByRole("button", { name: "Restart practice", exact: true })
    .tap();
  expect((await waitReady(page)).attempts).toBe(0);
});

test("native held aim cancels on viewport rotation and restart; both orientations remain playable", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/?automation&mode=practice");
  const cd = await context.newCDPSession(page);
  for (const transition of ["rotate", "restart"]) {
    const s = await waitReady(page),
      box = (await page.locator("main.game").boundingBox())!;
    const p = {
      x: box.x + s.ballScreen.x + s.ballScreen.radius * 0.6,
      y: box.y + s.ballScreen.y,
      id: 1,
    };
    await cd.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [p],
    });
    await cd.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ ...p, y: p.y - s.height * 0.3 }],
    });
    expect(
      (await page.evaluate(() => window.afterHours3D!.snapshot())).phase,
    ).toBe("aiming");
    if (transition === "rotate")
      await page.setViewportSize({ width: 712, height: 400 });
    else {
      await page
        .getByRole("button", { name: "Restart practice", exact: true })
        .focus();
      await page.keyboard.press("Enter");
    }
    await cd.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    expect((await waitReady(page)).attempts).toBe(0);
  }
  await cd.detach();
  const landscape = await swipe(page, { touch: true });
  expect((await shotResult(page, landscape.attempt)).made).toBe(true);
  await page.setViewportSize({ width: 430, height: 820 });
  const portrait = await swipe(page, { touch: true });
  expect((await shotResult(page, portrait.attempt)).made).toBe(true);
});

test("real WebGL context loss restores rendering and bounded uploads across restart", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?automation&mode=practice");
  const initial = await waitReady(page);
  await page.evaluate(async () => {
    const canvas = document.querySelector("canvas")!;
    const gl = canvas.getContext("webgl2")!;
    const extension = gl.getExtension("WEBGL_lose_context");
    if (!extension)
      throw new Error(
        "WEBGL_lose_context unavailable; cannot verify restoration",
      );
    await new Promise<void>((resolve) => {
      canvas.addEventListener("webglcontextrestored", () => resolve(), {
        once: true,
      });
      canvas.addEventListener(
        "webglcontextlost",
        () => setTimeout(() => extension.restoreContext(), 150),
        { once: true },
      );
      extension.loseContext();
    });
  });
  const first = await swipe(page, { touch: true });
  expect((await shotResult(page, first.attempt)).made).toBe(true);
  const restored = await page.evaluate(() => window.afterHours3D!.snapshot());
  expect(restored.render.artUploads).toBeGreaterThanOrEqual(
    initial.render.artUploads,
  );
  for (let i = 0; i < 3; i++) {
    await page
      .getByRole("button", { name: "Restart practice", exact: true })
      .tap();
    const state = await waitReady(page);
    expect(state.render.artUploads).toBe(restored.render.artUploads);
    expect(state.render.textures).toBeLessThanOrEqual(
      initial.render.textures + 1,
    );
    expect(state.bodyCount).toBe(1);
  }
  expect(errors).toEqual([]);
});
