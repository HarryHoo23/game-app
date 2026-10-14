import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";
import { physics } from "../data/physics";
import { levels } from "../data/levels";
import { launchVector } from "../domain/shooting/launch";
import { predictTrajectory } from "../domain/shooting/trajectory";
import {
  calculateStats,
  initialProgress,
} from "../domain/progression/progress";
import { BasketDetector } from "../domain/scoring/basketDetector";
const require = createRequire(import.meta.url);
const Engine =
  require("phaser/src/physics/matter-js/lib/core/Engine") as typeof MatterJS.Engine;
const Bodies =
  require("phaser/src/physics/matter-js/lib/factory/Bodies") as typeof MatterJS.Bodies;
const Body =
  require("phaser/src/physics/matter-js/lib/body/Body") as typeof MatterJS.Body;
const Composite =
  require("phaser/src/physics/matter-js/lib/body/Composite") as typeof MatterJS.Composite;
const stats = calculateStats(initialProgress());

describe("front-facing court", () => {
  it("centres launch and every hoop without changing budgets or scoring targets", () => {
    expect(physics.origin.x).toBe(physics.width / 2);
    expect(levels.every((l) => l.hoopX === physics.width / 2)).toBe(true);
    expect(
      levels.slice(0, 3).map((l) => [l.targetScore, l.totalShots]),
    ).toEqual([
      [10, 10],
      [16, 10],
      [24, 12],
    ]);
  });
  it("keeps a vertical drag on the court centreline", () => {
    const velocity = launchVector(0, -146, stats)!;
    expect(velocity.x).toBe(0);
    expect(velocity.y).toBeLessThan(0);
    expect(
      predictTrajectory(velocity).every((p) => p.x === physics.width / 2),
    ).toBe(true);
  });
  it("makes horizontal aiming less sensitive for a front-view hoop, without snapping to centre", () => {
    const v = launchVector(10, -146, stats)!;
    expect(v.x).toBeGreaterThan(0);
    expect(v.x).toBeLessThan(0.6);
    expect(launchVector(-10, -146, stats)!.x).toBeCloseTo(-v.x);
  });
  it.each([
    { dx: 0, dy: -146, make: true },
    { dx: 0, dy: -100, make: false },
    { dx: 30, dy: -146, make: false },
    { dx: -30, dy: -146, make: false },
  ])(
    "requires sufficient power and accurate aim: $dx/$dy",
    async ({ dx, dy, make }) => {
      const { getHoopGeometry } =
        await import("../domain/shooting/hoopGeometry");
      const level = levels[0],
        g = getHoopGeometry(level);
      const engine = Engine.create();
      const gravity = (
        engine as unknown as { gravity: { y: number; scale: number } }
      ).gravity;
      gravity.y = 1;
      gravity.scale = physics.gravity;
      const ball = Bodies.circle(
        physics.origin.x,
        physics.origin.y,
        physics.ballRadius,
        { frictionAir: 0, restitution: 0.72, label: "ball" },
      );
      const bodies = [
        ball,
        Bodies.circle(level.hoopX - g.rimHalfWidth, level.hoopY, g.rimRadius, {
          isStatic: true,
          label: "rim",
        }),
        Bodies.circle(level.hoopX + g.rimHalfWidth, level.hoopY, g.rimRadius, {
          isStatic: true,
          label: "rim",
        }),
        Bodies.rectangle(
          level.hoopX,
          g.boardTopY,
          g.boardWidth,
          g.boardThickness,
          { isStatic: true, label: "backboard" },
        ),
      ];
      for (const b of bodies)
        Composite.add(engine.world as unknown as MatterJS.CompositeType, b);
      Body.setVelocity(ball, launchVector(dx, dy, stats)!);
      const detector = new BasketDetector(
        level.hoopX,
        level.hoopY,
        g.clearHalfWidth,
        physics.ballRadius,
      );
      let made = false;
      for (let i = 0; i < 300; i++) {
        const previous = { ...ball.position };
        Engine.update(engine, physics.stepMs);
        if (detector.sample(previous, ball.position)) {
          made = true;
          break;
        }
      }
      expect(made).toBe(make);
      Engine.clear(engine);
    },
  );
});
