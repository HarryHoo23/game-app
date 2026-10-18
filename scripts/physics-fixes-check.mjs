import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const mode = process.argv[2] ?? "after";
const root = `docs/physics-fixes/2026-10-18/${mode}`;
await mkdir(root, { recursive: true });
const cases =
  mode === "after-board"
    ? [["backboard", 46, -145]]
    : [
        ["backboard", 46, -145],
        ["rim-handoff", 38, -125],
        ["board-handoff", 80, -146],
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
    await page.waitForTimeout(220);
    await page.screenshot({ path: `${root}/${name}.png` });
    const result = await page.evaluate(() =>
      JSON.parse(
        JSON.stringify({
          audit: {
            events: window.__physicsAudit.events,
            frames: window.__physicsAudit.frames,
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
    console.log(JSON.stringify(row));
    assert.deepEqual(errors, []);
    assert.deepEqual(result.resolutions, [0]);
    assert.equal(result.score, 0);
    if (mode !== "before" && name === "backboard") {
      assert.ok(
        board.velocity.y > 6,
        `backboard loses normalized velocity: ${board.velocity.y}`,
      );
      assert.ok(result.feedback.some((e) => e.board));
    }
    if (mode === "after" && name !== "backboard") {
      assert.ok(
        handoff.nearest.matterGapLogical >= -0.02,
        `penetrating handoff ${row.handoffGap}`,
      );
      assert.ok(
        !result.audit.events.some(
          (e) => e.type === "response" && e.origin === "height-gate",
        ),
        "scripted contact must not precede swept physical contact",
      );
      if (name === "rim-handoff") {
        assert.ok(
          result.audit.events.some(
            (e) => e.type === "matter:start" && e.other === "rim",
          ),
        );
        assert.equal(
          result.audit.events.filter((e) => e.type === "response").length,
          0,
        );
      } else {
        assert.ok(
          result.audit.events.some((e) => e.type === "handoff-deferred"),
        );
        assert.equal(
          result.audit.events.filter(
            (e) => e.type === "matter:start" && e.other === "backboard",
          ).length,
          0,
        );
      }
    }
  }
  await writeFile(
    `${root}/summary.json`,
    JSON.stringify(summary, null, 2) + "\n",
  );
} finally {
  await browser.close();
}
