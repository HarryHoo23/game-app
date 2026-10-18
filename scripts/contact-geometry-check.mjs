import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
const mode = process.argv[2] ?? "after";
const root = `docs/contact-geometry/2026-10-18/${mode}`;
await mkdir(root, { recursive: true });
const cases = [
  ["front-rim", 0, -125],
  ["back-rim", 0, -165],
  ["backboard", 46, -145],
  ["swish", 0, -140],
  ["perfect", 0, -146],
  ["airball", 80, -100],
  ["rim-handoff", 38, -125],
  ["board-handoff", 80, -146],
  ...(mode === "after"
    ? [
        ["normal-make", 19, -146],
        ["edge-miss", 20, -146],
      ]
    : []),
];
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  summary = [];
try {
  for (const [name, dx, dy] of cases) {
    const context = await browser.newContext({
      viewport: { width: 400, height: 712 },
      recordVideo: {
        dir: "test-results/physics-fixes-video",
        size: { width: 400, height: 712 },
      },
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://localhost:5173/?debug&debugPhysics");
    await page
      .getByRole("button", { name: "Hit the court", exact: true })
      .click();
    await page.locator("[data-score]").waitFor();
    await page.evaluate(() => {
      const s = window.afterHours.scene.getScene("Game");
      window.fixTrace = {
        solver: [],
        feedback: [],
        resolutions: [],
        handoffs: [],
      };
      let count = 0;
      s.matter.world.on("afterupdate", () => {
        const starts = window.__physicsAudit.events.filter(
          (e) => e.type === "matter:start",
        );
        if (starts.length > count) {
          count = starts.length;
          window.fixTrace.solver.push({
            contact: starts.at(-1),
            position: { ...s.physicsCourt.ball.body.position },
            velocity: { ...s.physicsCourt.ball.body.velocity },
            mass: s.physicsCourt.ball.body.mass,
            area: s.physicsCourt.ball.body.area,
            inertia: s.physicsCourt.ball.body.inertia,
          });
        }
      });
      const feedback = s.feedback.rim.bind(s.feedback);
      s.feedback.rim = (board) => {
        window.fixTrace.feedback.push({ board });
        return feedback(board);
      };
      const resolve = s.resolve.bind(s);
      s.resolve = (score) => {
        if (!s.settled && s.session.inFlight)
          window.fixTrace.resolutions.push(score);
        return resolve(score);
      };
      const finish = s.physicsCourt.finishControlled.bind(s.physicsCourt);
      s.physicsCourt.finishControlled = (pose) => {
        window.fixTrace.handoffs.push({
          pose: JSON.parse(JSON.stringify(pose)),
          before: { ...s.physicsCourt.ball.body.position },
        });
        return finish(pose);
      };
    });
    await page.mouse.move(200, 674);
    await page.mouse.down();
    await page.mouse.move(200 + dx, 674 + dy, { steps: 12 });
    await page.mouse.up();
    await page.waitForFunction(() => window.fixTrace.resolutions.length);
    await page.screenshot({ path: `${root}/${name}-first-result.png` });
    await page.waitForTimeout(180);
    await page.screenshot({ path: `${root}/${name}.png` });
    const result = await page.evaluate(() =>
      JSON.parse(
        JSON.stringify({
          audit: {
            events: window.__physicsAudit.events,
            frames: window.__physicsAudit.frames,
            metadata: window.__physicsAudit.metadata,
          },
          ...window.fixTrace,
          score: window.afterHours.scene.getScene("Game").session.score,
          plan: window.afterHours.scene.getScene("Game").shot.currentPlan,
        }),
      ),
    );
    await writeFile(
      `${root}/${name}.json`,
      JSON.stringify({ gesture: { dx, dy }, ...result }, null, 2) + "\n",
    );
    const video = page.video();
    await context.close();
    await video.saveAs(`${root}/${name}.webm`);
    const handoff = result.audit.events.find((e) => e.type === "handoff"),
      response = result.audit.events.find((e) => e.type === "response"),
      board = result.solver.find((e) => e.contact.other === "backboard");
    const row = {
      gesture: { dx, dy },
      plan: result.plan,
      contacts: result.audit.events
        .filter((e) => e.type === "matter:start")
        .map((e) => ({
          ms: e.ms,
          other: e.other,
          arc: e.arc,
          supports: e.supports,
        })),
      radius: result.audit.frames.at(-1),
      name,
      score: result.score,
      boardPostSolver: board?.velocity,
      handoffMs: handoff.ms,
      handoffGap: handoff.nearest.matterGapLogical,
      responseOrigin: response?.origin,
      feedbackCount: result.feedback.length,
      resolutions: result.resolutions,
    };
    summary.push(row);
    console.log(
      JSON.stringify({
        name,
        score: result.score,
        handoffMs: row.handoffMs,
        gap: row.handoffGap,
        contacts: row.contacts.map((c) => [c.ms, c.other, c.arc]),
      }),
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(result.resolutions, [
      name === "perfect"
        ? 4
        : name === "swish"
          ? 3
          : name === "normal-make"
            ? 2
            : 0,
    ]);
    if (mode === "after") {
      const events = result.audit.events;
      assert.ok(
        !events.some((e) => e.type === "response" || e.type === "height-gate"),
      );
      assert.ok(
        handoff.nearest.matterGapLogical >= 0,
        "handoff overlaps an ENABLED collider",
      );
      for (const f of result.audit.frames) {
        assert.ok(
          Math.abs(f.matterRadiusScreen - f.visualSolidRadiusScreen) < 1e-7,
          `${name}: radius mismatch`,
        );
        if (f.phase === "CONTROLLED_FLIGHT" || f.phase === "CONTROLLED_PASS")
          assert.equal(f.mask, 0);
        if (f.visualCenter)
          assert.ok(
            Math.hypot(
              f.visualCenter.x - f.centerScreen.x,
              f.visualCenter.y - f.centerScreen.y,
            ) < 0.01,
            `${name}: center mismatch`,
          );
      }
      assert.equal(
        result.audit.metadata.colliders.filter((c) => c.arc === "front").length,
        8,
      );
      assert.equal(
        result.audit.metadata.colliders.filter((c) => c.arc === "back").length,
        8,
      );
      for (const sample of result.solver) {
        assert.ok(Number.isFinite(sample.inertia));
        assert.ok(
          Math.abs(sample.mass / sample.area - 0.001) < 1e-9,
          "scaled body mass must match its area",
        );
      }
      const rim = row.contacts.find((c) => c.other === "rim");
      if (["front-rim", "rim-handoff", "back-rim"].includes(name)) {
        assert.equal(rim?.arc, name === "back-rim" ? "back" : "front");
        assert.equal(
          events.filter((e) => e.type === "engine-response").length,
          1,
          "one primary solver-owned response",
        );
      }
      if (name === "backboard")
        assert.ok(row.contacts.some((c) => c.other === "backboard"));
      if (["swish", "perfect", "normal-make"].includes(name)) {
        assert.equal(
          events.filter((e) => e.type === "resolve")[0].stage,
          "BELOW_HOOP",
        );
        assert.ok(
          !row.contacts.some(
            (c) => c.other === "rim" || c.other === "backboard",
          ),
        );
      }
      if (["airball", "board-handoff"].includes(name))
        assert.ok(!row.contacts.some((c) => c.other !== "ground"));
      if (!["normal-make", "edge-miss"].includes(name)) {
        const before = JSON.parse(
          await readFile(
            `docs/contact-geometry/2026-10-18/before/${name}.json`,
            "utf8",
          ),
        );
        assert.deepEqual(
          result.plan,
          before.plan,
          "input and deterministic trajectory must be identical",
        );
      }
    }
  }
  if (mode === "after") {
    const parity = [];
    for (const [name, dx, dy] of cases) {
      const context = await browser.newContext({
        viewport: { width: 400, height: 712 },
      });
      const p = await context.newPage();
      await p.goto("http://localhost:5173/?debug");
      await p
        .getByRole("button", { name: "Hit the court", exact: true })
        .click();
      await p.locator("[data-score]").waitFor();
      await p.evaluate(() => {
        const s = window.afterHours.scene.getScene("Game");
        window.contactParity = { handoffs: [], resolutions: [] };
        const finish = s.physicsCourt.finishControlled.bind(s.physicsCourt);
        s.physicsCourt.finishControlled = (pose) => {
          const released = finish(pose);
          if (released)
            window.contactParity.handoffs.push({
              pose: JSON.parse(JSON.stringify(pose)),
              velocity: { ...s.physicsCourt.ball.body.velocity },
            });
          return released;
        };
        const resolve = s.resolve.bind(s);
        s.resolve = (score) => {
          if (!s.settled && s.session.inFlight)
            window.contactParity.resolutions.push(score);
          return resolve(score);
        };
      });
      await p.mouse.move(200, 674);
      await p.mouse.down();
      await p.mouse.move(200 + dx, 674 + dy, { steps: 12 });
      await p.mouse.up();
      await p.waitForFunction(() => window.contactParity.resolutions.length);
      const data = await p.evaluate(() => ({
        trace: window.contactParity,
        plan: window.afterHours.scene.getScene("Game").shot.currentPlan,
      }));
      const on = JSON.parse(await readFile(`${root}/${name}.json`, "utf8"));
      const handoff = on.audit.events.find((e) => e.type === "handoff");
      assert.deepEqual(data.plan, on.plan);
      assert.deepEqual(data.trace.resolutions, on.resolutions);
      assert.deepEqual(data.trace.handoffs[0].pose, handoff.pose);
      assert.deepEqual(data.trace.handoffs[0].velocity, handoff.velocity);
      parity.push({ name, ...data });
      await context.close();
    }
    await writeFile(
      `${root}/overlay-parity.json`,
      JSON.stringify(parity, null, 2) + "\n",
    );
  }
  await writeFile(
    `${root}/summary.json`,
    JSON.stringify(summary, null, 2) + "\n",
  );
} finally {
  await browser.close();
}
