// Isolated runtime experiment only. No gameplay source or saved progress is changed.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const trials = [];
try {
  for (const mode of ["current", "skip-redundant-board-setVelocity"]) {
    const context = await browser.newContext({
        viewport: { width: 400, height: 712 },
      }),
      p = await context.newPage();
    await p.goto("http://localhost:5173/?debug&debugPhysics");
    await p.getByRole("button", { name: "Hit the court", exact: true }).click();
    await p.locator("[data-score]").waitFor();
    await p.evaluate((mode) => {
      const s = window.afterHours.scene.getScene("Game"),
        original = s.respondToMiss.bind(s);
      window.velocityExperiment = [];
      if (mode !== "current")
        s.respondToMiss = function (impact) {
          if (impact !== "backboard") return original(impact);
          const ball = s.physicsCourt.ball,
            set = ball.setVelocity;
          ball.setVelocity = function (x, y) {
            window.velocityExperiment.push({
              requested: { x, y },
              skipped: true,
            });
            return this;
          };
          try {
            return original(impact);
          } finally {
            ball.setVelocity = set;
          }
        };
      let took = false;
      s.matter.world.on("afterupdate", () => {
        if (
          !took &&
          window.__physicsAudit.events.some(
            (e) => e.type === "response" && e.impact === "backboard",
          )
        ) {
          took = true;
          const b = s.physicsCourt.ball.body;
          window.velocityExperiment.push({
            postSolver: { ...b.velocity },
            position: { ...b.position },
          });
        }
      });
    }, mode);
    await p.mouse.move(200, 674);
    await p.mouse.down();
    await p.mouse.move(246, 529, { steps: 12 });
    await p.mouse.up();
    await p.waitForFunction(() =>
      window.velocityExperiment.some((e) => e.postSolver),
    );
    const result = await p.evaluate(() => ({
      response: window.__physicsAudit.events.find((e) => e.type === "response"),
      trial: window.velocityExperiment,
      score: window.afterHours.scene.getScene("Game").session.score,
    }));
    trials.push({ mode, ...result });
    await context.close();
  }
  const standard = trials[0].response.normalizedVelocity.y,
    raw = trials[0].response.incoming.y;
  assert.ok(Math.abs(standard - 2 * raw) < 1e-7);
  assert.equal(trials[0].score, trials[1].score);
  console.log(
    JSON.stringify(
      trials.map((t) => ({
        mode: t.mode,
        incoming60: t.response.normalizedVelocity,
        raw: t.response.incoming,
        postSolver: t.trial.find((e) => e.postSolver).postSolver,
        score: t.score,
      })),
      null,
      2,
    ),
  );
  await writeFile(
    "docs/physics-audit/2026-10-18/velocity-probe.json",
    JSON.stringify(
      {
        note: "Counterfactual browser-only method interception; skipped one redundant velocity assignment only. No source fix applied.",
        trials,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
