import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const root = "docs/physics-audit/2026-10-18";
await mkdir(`${root}/cases`, { recursive: true });
const cases = [
  ["front-rim", 0, -125],
  ["back-rim", 0, -165],
  ["backboard", 46, -145],
  ["swish", 0, -140],
  ["airball", 80, -100],
  ["airball-then-board", 80, -146],
  ["rim-make", 20, -146],
  ["penetrating-handoff", 38, -125],
];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const summary = [],
  errors = [];
async function prepare(debug = true, video = false) {
  const context = await browser.newContext({
    viewport: { width: 400, height: 712 },
    ...(video
      ? {
          recordVideo: {
            dir: "test-results/physics-audit-video",
            size: { width: 400, height: 712 },
          },
        }
      : {}),
  });
  const p = await context.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(`http://localhost:5173/?debug${debug ? "&debugPhysics" : ""}`);
  await p.getByRole("button", { name: "Hit the court", exact: true }).click();
  await p.locator("[data-score]").waitFor();
  return { context, p };
}
async function shot(p, dx, dy) {
  await p.mouse.move(200, 674);
  await p.mouse.down();
  await p.mouse.move(200 + dx, 674 + dy, { steps: 12 });
  await p.mouse.up();
}
async function armCapture(p, name) {
  await p.evaluate((name) => {
    const s = window.afterHours.scene.getScene("Game");
    window.auditCapture = false;
    const stop = () => {
      const events = window.__physicsAudit.events;
      const match =
        name === "swish"
          ? s.pass.stage === "IN_NET"
          : name === "rim-make"
            ? events.some((e) => e.type === "candidate-rim-feedback")
            : name === "backboard" || name === "airball-then-board"
              ? events.some(
                  (e) => e.type === "matter:start" && e.other === "backboard",
                )
              : name === "airball"
                ? s.settled
                : events.some((e) => e.type === "response");
      if (match) {
        s.events.off("postupdate", stop);
        s.scene.pause();
        window.auditCapture = true;
      }
    };
    s.events.on("postupdate", stop);
  }, name);
}
try {
  for (const [name, dx, dy] of cases) {
    const { context, p } = await prepare(true, true);
    if (name === "front-rim")
      await p.screenshot({ path: `${root}/00-idle-overlay.png` });
    await armCapture(p, name);
    await shot(p, dx, dy);
    await p.waitForFunction(() => window.auditCapture);
    await p.screenshot({ path: `${root}/cases/${name}.png` });
    const captured = await p.evaluate(() => window.__physicsAudit.snapshot());
    await p.evaluate(() =>
      window.afterHours.scene.getScene("Game").scene.resume(),
    );
    await p.waitForFunction(() =>
      window.__physicsAudit.events.some((e) => e.type === "resolve"),
    );
    await p.waitForTimeout(100);
    const data = await p.evaluate(() =>
      JSON.parse(
        JSON.stringify({
          events: window.__physicsAudit.events,
          frames: window.__physicsAudit.frames,
          metadata: window.__physicsAudit.metadata,
          score: window.afterHours.scene.getScene("Game").session.score,
        }),
      ),
    );
    const events = data.events,
      find = (type) => events.filter((e) => e.type === type),
      response = find("response"),
      handoffs = find("handoff"),
      actual = find("matter:start");
    assert.equal(
      data.score,
      name === "swish" ? 3 : name === "rim-make" ? 2 : 0,
    );
    const primary = find("step").filter((e) => e.phase === "CONTROLLED_FLIGHT");
    assert.ok(primary.length > 50);
    assert.ok(primary.every((e) => e.isStatic && e.mask === 0));
    for (const c of actual) assert.notEqual(c.mask, 0);
    if (name === "front-rim" || name === "back-rim") {
      assert.equal(response[0].origin, "height-gate");
      assert.ok(response[0].nearest.matterGapLogical > 0);
      assert.ok(
        !actual.some((c) => c.other === "rim" && c.ms <= response[0].ms),
      );
    }
    if (name === "backboard") {
      assert.ok(actual.some((c) => c.other === "backboard"));
      assert.equal(response[0].origin, "collision-gate");
      assert.ok(
        Math.abs(
          response[0].incoming.y * 2 - response[0].normalizedVelocity.y,
        ) < 1e-7,
      );
    }
    if (name === "swish" || name === "rim-make") {
      assert.equal(handoffs[0].path, "exit");
      assert.ok(
        find("step")
          .filter((e) => e.phase === "CONTROLLED_PASS")
          .every((e) => e.mask === 0),
      );
      assert.ok(!actual.some((c) => c.other === "rim"));
    }
    if (name === "airball")
      assert.equal(actual.filter((e) => e.other !== "ground").length, 0);
    if (name === "airball-then-board")
      assert.ok(
        actual.find((c) => c.other === "backboard").ms > find("resolve")[0].ms,
      );
    if (name === "penetrating-handoff")
      assert.ok(handoffs[0].nearest.matterGapLogical < 0);
    const row = {
      name,
      dx,
      dy,
      score: data.score,
      prediction: find("prediction")[0]?.result,
      controlledFlightLastMs: primary.at(-1)?.ms,
      handoff: handoffs[0],
      response: response[0],
      actual: actual.map((e) => ({
        ms: e.ms,
        other: e.other,
        supports: e.supports,
        velocity: e.velocity,
        normalizedVelocity: e.normalizedVelocity,
        nearest: e.nearest,
      })),
      capture: captured,
      launch: data.events.find((e) => e.type === "launch"),
    };
    summary.push(row);
    await writeFile(
      `${root}/cases/${name}.json`,
      JSON.stringify(
        {
          gesture: {
            start: { x: 200, y: 674 },
            end: { x: 200 + dx, y: 674 + dy },
            steps: 12,
          },
          capture: captured,
          ...data,
        },
        null,
        2,
      ) + "\n",
    );
    const video = p.video();
    await context.close();
    await video.saveAs(`${root}/cases/${name}.webm`);
    console.log(
      name,
      JSON.stringify({
        score: data.score,
        handoffMs: row.handoff.ms,
        bodyGap: row.handoff.nearest.matterGapLogical,
        responseMs: row.response?.ms,
        origin: row.response?.origin,
        actual: row.actual.map((e) => [e.ms, e.other]),
      }),
    );
  }
  // Diagnostics must be observational: identical raw input has identical handoff/result without overlay.
  const parity = [];
  for (const [name, dx, dy] of cases) {
    const { context, p } = await prepare(false);
    await p.evaluate(() => {
      const s = window.afterHours.scene.getScene("Game");
      window.offAuditTrace = { handoffs: [], responses: [] };
      const finish = s.physicsCourt.finishControlled.bind(s.physicsCourt);
      s.physicsCourt.finishControlled = (pose) => {
        const result = finish(pose);
        window.offAuditTrace.handoffs.push({
          pose: JSON.parse(JSON.stringify(pose)),
          velocity: { ...s.physicsCourt.ball.body.velocity },
        });
        return result;
      };
      const respond = s.respondToMiss.bind(s);
      s.respondToMiss = (impact) => {
        const incoming = { ...s.physicsCourt.ball.body.velocity };
        const result = respond(impact);
        window.offAuditTrace.responses.push({
          impact,
          incoming,
          outgoing: { ...s.physicsCourt.ball.body.velocity },
        });
        return result;
      };
    });
    await shot(p, dx, dy);
    await p.waitForFunction(
      () => window.afterHours.scene.getScene("Game").settled,
    );
    const result = await p.evaluate(() => {
      const s = window.afterHours.scene.getScene("Game");
      return {
        score: s.session.score,
        plan: s.shot.currentPlan,
        impact: s.resultImpact,
        trace: window.offAuditTrace,
      };
    });
    assert.equal(result.score, summary.find((r) => r.name === name).score);
    const on = summary.find((r) => r.name === name);
    assert.deepEqual(result.plan, on.launch.plan);
    assert.deepEqual(result.trace.handoffs[0].pose, on.handoff.pose);
    assert.deepEqual(result.trace.handoffs[0].velocity, on.handoff.velocity);
    if (on.response) {
      assert.deepEqual(
        result.trace.responses[0].incoming,
        on.response.incoming,
      );
      for (const axis of ["x", "y"])
        assert.ok(
          Math.abs(
            result.trace.responses[0].outgoing[axis] -
              on.response.outgoing[axis],
          ) < 1e-8,
        );
    }
    assert.equal(
      result.impact,
      summary.find((r) => r.name === name).prediction.impact === "airball" &&
        name === "backboard"
        ? "backboard"
        : summary.find((r) => r.name === name).prediction.impact,
    );
    parity.push({ name, ...result });
    await context.close();
  }
  const lifecycle = await prepare(true);
  await lifecycle.p.evaluate(() => {
    history.replaceState(null, "", "/?debug");
    window.afterHours.scene.getScene("Game").scene.restart({ levelId: 1 });
  });
  await lifecycle.p.waitForFunction(() => {
    const s = window.afterHours.scene.getScene("Game");
    return !s.audit && !window.__physicsAudit && s.scene.isActive();
  });
  await lifecycle.context.close();
  assert.deepEqual(errors, []);
  await writeFile(
    `${root}/summary.json`,
    JSON.stringify(
      {
        auditedHead: "a8b4ee28a9bfaddc83a7ec19840408f4ff4a4c60",
        cases: summary,
        overlayOffParity: parity,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS physics audit:8 real-input cases, masks, response provenance, actual SAT, pre-solver units, penetration, unchanged outcomes without overlay.",
  );
} finally {
  await browser.close();
}
