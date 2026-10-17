import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const out = "docs/input-rim/2026-10-17";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [],
  results = [];
async function open(record = false) {
  const context = await browser.newContext({
    viewport: { width: 400, height: 712 },
    ...(record
      ? {
          recordVideo: {
            dir: "test-results/input-rim-video",
            size: { width: 400, height: 712 },
          },
        }
      : {}),
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:5173/?debug&debugInput");
  await page
    .getByRole("button", { name: "Hit the court", exact: true })
    .click();
  await page.locator("[data-score]").waitFor();
  return { context, page };
}
async function ready(page) {
  await page.waitForFunction(() => {
    const s = window.afterHours.scene.getScene("Game");
    return !s.session.inFlight && !s.settled && !s.session.finished;
  });
}
async function shoot(page, dx = 0, dy = -146, steps = 12, x = 200, y = 674) {
  await ready(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps });
  await page.mouse.up();
}
async function outcome(page) {
  await page.waitForFunction(
    () => window.__inputDebug?.shots.at(-1)?.finalScore != null,
  );
  return page.evaluate(() => ({ ...window.__inputDebug.shots.at(-1) }));
}
async function freeze(page, condition, path) {
  await page.evaluate((predicate) => {
    const s = window.afterHours.scene.getScene("Game");
    const matches = new Function("s", `return ${predicate}`);
    const stop = () => {
      if (matches(s)) {
        s.events.off("postupdate", stop);
        s.scene.pause();
        window.__captureReached = true;
      }
    };
    window.__captureReached = false;
    s.events.on("postupdate", stop);
  }, condition);
  await page.waitForFunction(() => window.__captureReached);
  await page.screenshot({ path: `${out}/${path}.png` });
  const pose = await page.evaluate(() => {
    const s = window.afterHours.scene.getScene("Game"),
      h = s.hoop;
    return {
      stage: s.pass.stage,
      ball: s.ballView.image.getBounds(),
      score: s.session.score,
      depth: s.ballView.image.depth,
      parent: s.ballView.image.parentContainer === h.rimContainer,
      order: h.rimContainer.list.map((o) =>
        o === h.rimBack
          ? "rear"
          : o === h.rimFront
            ? "front"
            : o === h.net
              ? "net"
              : o === s.ballView.image
                ? "ball"
                : "ghost",
      ),
    };
  });
  await page.evaluate(() =>
    window.afterHours.scene.getScene("Game").scene.resume(),
  );
  return pose;
}
try {
  // Representative actual pointer gestures; no injected plan or score.
  const { context, page } = await open(true);
  await page.screenshot({ path: `${out}/01-idle.png` });
  await page.screenshot({
    path: `${out}/01-idle-hoop-closeup.png`,
    clip: { x: 100, y: 145, width: 200, height: 215 },
  });
  const idle = await page.evaluate(() => {
    const h = window.afterHours.scene.getScene("Game").hoop;
    const tf = (i) => [
      i.x,
      i.y,
      i.scaleX,
      i.scaleY,
      i.rotation,
      i.originX,
      i.originY,
    ];
    return {
      rear: tf(h.rimBack),
      front: tf(h.rimFront),
      sameSource:
        h.rimBack.texture === h.rimFront.texture &&
        h.rimBack.frame === h.rimFront.frame,
      parent:
        h.rimBack.parentContainer === h.rimContainer &&
        h.rimFront.parentContainer === h.rimContainer,
      crop: h.rimFront.isCropped,
      net: {
        x: h.net.x,
        y: h.net.y,
        sx: h.net.scaleX,
        sy: h.net.scaleY,
        r: h.net.rotation,
      },
      ball: h.container.getBounds(),
    };
  });
  assert.deepEqual(idle.rear, idle.front);
  assert.ok(idle.sameSource && idle.parent && idle.crop);
  for (const [index, dx] of [0, 8, -8, 15, -15, 25, -25].entries()) {
    await shoot(
      page,
      dx,
      -146,
      [5, 12, 30][index % 3],
      190 + (index % 3) * 10,
      670 + (index % 2) * 5,
    );
    const result = await outcome(page);
    results.push({ kind: "representative", ...result });
    if (Math.abs(dx) <= 15)
      assert.ok(result.finalScore > 0, JSON.stringify(result));
    else assert.equal(result.finalScore, 0);
  }
  for (const [name, dx, dy] of [
    ["diagonal", 38, -146],
    ["weak", 0, -85],
    ["strong", 0, -210],
  ]) {
    await shoot(page, dx, dy);
    const result = await outcome(page);
    results.push({ kind: name, ...result });
    assert.equal(result.finalScore, 0);
  }
  const video = page.video();
  await context.close();
  await video.saveAs(`${out}/human-input.webm`);
  // Same endpoints, genuinely different browser sampling, equipment preview smoothing active.
  const p = await open();
  await p.page.evaluate(() => {
    window.afterHours.scene.getScene("Game").stats.smoothing = 0.45;
  });
  const plans = [];
  for (const moves of [5, 12, 30]) {
    await shoot(p.page, 15, -146, moves, 194, 671);
    await outcome(p.page);
    plans.push(
      await p.page.evaluate(() =>
        JSON.parse(
          JSON.stringify(
            window.afterHours.scene.getScene("Game").shot.currentPlan,
          ),
        ),
      ),
    );
  }
  assert.deepEqual(plans[0], plans[1]);
  assert.deepEqual(plans[1], plans[2]);
  await p.context.close();
  // Capture naturally reached poses; diagnostic scene pause prevents screenshot latency skipping entry.
  const poses = {};
  for (const [name, predicate] of [
    [
      "02-above-rim",
      "s.shot.active && s.shot.elapsedMs>650 && s.shot.elapsedMs<750",
    ],
    ["03-entering-rim", "s.pass.stage==='AT_RIM'"],
    ["04-inside-net", "s.pass.stage==='IN_NET' && s.pass.elapsedMs>55"],
    ["05-rim-hit", "s.hoop.rimContainer.x>0.1"],
  ]) {
    const q = await open();
    await shoot(q.page, name === "05-rim-hit" ? 25 : 0);
    poses[name] = await freeze(q.page, predicate, name);
    if (name === "03-entering-rim" || name === "04-inside-net") {
      assert.equal(poses[name].depth, 4);
      assert.equal(poses[name].score, 0);
      assert.ok(poses[name].parent);
      assert.ok(
        poses[name].order.indexOf("rear") < poses[name].order.indexOf("ball"),
      );
      assert.ok(
        poses[name].order.indexOf("ball") < poses[name].order.indexOf("front"),
      );
    }
    await q.context.close();
  }
  const r = await open();
  await shoot(r.page);
  await outcome(r.page);
  await ready(r.page);
  const reset = await r.page.evaluate(() => {
    const h = window.afterHours.scene.getScene("Game").hoop;
    return {
      net: {
        x: h.net.x,
        y: h.net.y,
        sx: h.net.scaleX,
        sy: h.net.scaleY,
        r: h.net.rotation,
      },
      rimX: h.rimContainer.x,
    };
  });
  assert.deepEqual(reset.net, idle.net);
  assert.equal(reset.rimX, 0);
  await r.page.screenshot({ path: `${out}/06-reset.png` });
  // Lock remains exact during each real tween frame, and after scale/position/reset.
  const lock = await r.page.evaluate(async () => {
    const s = window.afterHours.scene.getScene("Game"),
      h = s.hoop,
      samples = [];
    h.playRimHit();
    for (let i = 0; i < 12; i++) {
      await new Promise(requestAnimationFrame);
      const a = h.rimBack.getWorldTransformMatrix(),
        b = h.rimFront.getWorldTransformMatrix();
      samples.push({
        a: [a.a, a.b, a.c, a.d, a.tx, a.ty],
        b: [b.a, b.b, b.c, b.d, b.tx, b.ty],
      });
    }
    for (const scale of [0.6, 1, 0.73]) {
      h.setScale(scale).setPosition(200, 285);
      h.reset();
      const a = h.rimBack.getWorldTransformMatrix(),
        b = h.rimFront.getWorldTransformMatrix();
      samples.push({
        a: [a.a, a.b, a.c, a.d, a.tx, a.ty],
        b: [b.a, b.b, b.c, b.d, b.tx, b.ty],
      });
    }
    return samples;
  });
  for (const v of lock) assert.deepEqual(v.a, v.b);
  const maxScreenShake = Math.max(
    ...lock.slice(0, 12).map((v) => Math.abs(v.a[4] - 200)),
  );
  assert.ok(maxScreenShake > 0.6 && maxScreenShake < 1.2);
  await r.context.close();
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/browser-results.json`,
    JSON.stringify(
      {
        results,
        endpointSamplingIdentical: true,
        idle,
        poses,
        reset,
        lockedTransformSamples: lock.length,
        maxScreenShake,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS input/rim: 10 actual pointer gestures, 5/12/30 endpoint invariance, 6 captures, same-source crop/depth, parent shake, reset, no browser errors.",
  );
  console.log(
    JSON.stringify(
      results.map((r) => ({
        dx: r.rawDx,
        dy: r.rawDy,
        power: r.mappedPower,
        aim: r.mappedAim,
        score: r.finalScore,
        impact: r.finalImpact,
      })),
    ),
  );
} finally {
  await browser.close();
}
