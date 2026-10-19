import { test, expect } from "@playwright/test";
test("production swipes score physically without DEV controls", async ({
  page,
}) => {
  await page.goto("http://localhost:4174/?mode=practice");
  await page.locator(".loading").waitFor({ state: "detached" });
  expect(await page.evaluate(() => typeof window.afterHours3D)).toBe(
    "undefined",
  );
  await expect(page.getByText("Session log", { exact: true })).toHaveCount(0);
  await page.mouse.move(200, 620);
  await page.mouse.down();
  await page.mouse.move(200, 406, { steps: 10 });
  await page.waitForTimeout(100);
  await page.mouse.up();
  await expect(page.getByTestId("makes")).toHaveText("1");
});
test("failed WebGL initialization gives a retry action", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof original>
    ) {
      if (String(args[0]).startsWith("webgl")) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.goto("/?mode=practice");
  await expect(
    page.getByRole("button", { name: "Reload court" }),
  ).toBeVisible();
});
