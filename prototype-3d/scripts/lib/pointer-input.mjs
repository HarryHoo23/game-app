/** Real browser input only; diagnostic reads cannot set ball positions or scores. */
export async function waitReady(page) {
  await page.waitForFunction(() => window.afterHours3D?.snapshot().ready);
  return page.evaluate(() => window.afterHours3D.snapshot());
}
export async function swipe(
  page,
  { up = 0.3, dx = 0, steps = 10, duration = 180, touch = false } = {},
) {
  const s = await waitReady(page),
    box = await page.locator("main.game").boundingBox(),
    p = s.ballScreen;
  const start = { x: box.x + p.x, y: box.y + p.y },
    end = { x: start.x + dx * s.width, y: start.y - up * s.height };
  const count = Math.max(1, steps),
    client = touch ? await page.context().newCDPSession(page) : null;
  const point = (i) => ({
    x: start.x + ((end.x - start.x) * i) / count,
    y: start.y + ((end.y - start.y) * i) / count,
    id: 1,
    radiusX: 4,
    radiusY: 4,
    force: 1,
  });
  if (client)
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [point(0)],
    });
  else {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
  }
  for (let i = 1; i <= count; i++) {
    if (client)
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [point(i)],
      });
    else await page.mouse.move(point(i).x, point(i).y);
    if (duration > 0) await page.waitForTimeout(duration / count);
  }
  if (client) {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await client.detach();
  } else await page.mouse.up();
  return {
    attempt: s.attempts + 1,
    start,
    end,
    viewport: { width: s.width, height: s.height },
    source: touch ? "native-touch" : "mouse",
  };
}
export async function shotResult(page, attempt) {
  await page.waitForFunction(
    (n) => {
      const a = window.afterHours3D?.session().shots.at(-1);
      return a?.shotId === n && a.result !== null;
    },
    attempt,
    { timeout: 10000 },
  );
  return page.evaluate(() => window.afterHours3D.session().shots.at(-1));
}
