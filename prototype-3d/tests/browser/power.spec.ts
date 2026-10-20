import { test, expect, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { waitReady, shotResult, swipe } from "./helpers";

const output = "docs/verification/power-2026-10-20/browser";

async function aimedShot(page: Page, up: number, screenshot?: string) {
  const s = await waitReady(page),
    p = s.ballScreen!;
  const client = await page.context().newCDPSession(page);
  try {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: p.x, y: p.y, id: 1 }],
    });
    for (let i = 1; i <= 10; i++) {
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: p.x, y: p.y - (up * s.height * i) / 10, id: 1 }],
      });
      await page.waitForTimeout(20);
    }
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.afterHours3D!.snapshot().shotVisuals?.previewVelocity?.y ??
            0,
        ),
      )
      .toBeGreaterThan(0);
    const preview = await page.evaluate(
      () => window.afterHours3D!.snapshot().shotVisuals!,
    );
    if (screenshot)
      await page.screenshot({ path: `${output}/${screenshot}.png` });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    const shot = await shotResult(page, s.attempts + 1);
    expect(shot.launch.velocity).toEqual(preview.previewVelocity);
    return shot;
  } finally {
    await client.detach();
  }
}

test("native touch makes low, standard and high physical arcs on a portrait screen", async ({
  page,
}) => {
  await mkdir(output, { recursive: true });
  await page.goto("/?automation&mode=practice");
  const shots = [];
  for (const [name, up] of [
    ["light", 0.06],
    ["normal", 0.3],
    ["heavy", 0.5],
  ] as const) {
    const shot = await aimedShot(page, up, name);
    shots.push(shot);
  }
  expect(shots[0].result).toBe("short");
  expect(shots[0].mappedTarget).toBeNull();
  expect(
    Math.max(
      ...shots[0].samples.map((s: { position: { y: number } }) => s.position.y),
    ),
  ).toBeLessThan(2.9);
  expect(shots[1].result).toBe("swish");
  expect(
    shots[1].crossings.filter(
      (c: { stage: string }) => c.stage === "lower-confirmed",
    ),
  ).toHaveLength(1);
  expect(shots[2].made).toBe(false);
  expect(
    Math.max(
      ...shots[2].samples.map((s: { position: { y: number } }) => s.position.y),
    ),
  ).toBeGreaterThan(4.9);
  await writeFile(
    `${output}/practice-shots.json`,
    JSON.stringify(shots, null, 2),
  );
});

test("all five angles accept light/heavy arcs, then retry preserves forgiving ordinary touch shots", async ({
  page,
}) => {
  await mkdir(output, { recursive: true });
  await page.goto("/?automation");
  const shots = [];
  for (let i = 0; i < 10; i++) {
    const s = await waitReady(page);
    expect(s.spotIndex).toBe(Math.floor(i / 2));
    const shot = await aimedShot(page, i % 2 === 0 ? 0.06 : 0.5);
    expect(shot.made).toBe(false);
    expect(shot.result).toBe(i % 2 === 0 ? "short" : "long");
    shots.push(shot);
  }
  await expect(
    page.getByRole("region", { name: "Round complete" }),
  ).toBeVisible();
  await page.screenshot({ path: `${output}/light-heavy-results.png` });
  await page.getByRole("button", { name: "PLAY AGAIN" }).tap();
  expect((await waitReady(page)).attempts).toBe(0);
  for (let i = 0; i < 10; i++) {
    const input = await swipe(page, {
      up: i % 2 === 0 ? 0.25 : 0.35,
      dx: 0.01,
      touch: true,
    });
    const shot = await shotResult(page, input.attempt);
    expect(shot.made).toBe(true);
    expect(
      shot.crossings.filter(
        (c: { stage: string }) => c.stage === "lower-confirmed",
      ),
    ).toHaveLength(1);
    shots.push(shot);
  }
  await expect(page.getByTestId("makes").first()).toHaveText("10 / 10");
  await writeFile(
    `${output}/five-spot-shots.json`,
    JSON.stringify(shots, null, 2),
  );
});
