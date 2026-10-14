import { getHoopGeometry } from "../domain/shooting/hoopGeometry";
import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";
import { levels } from "../data/levels";
import { physics } from "../data/physics";
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

describe("bundled Matter integration", () => {
  it.each(levels)("starter equipment can swish court $id", (level) => {
    const engine = Engine.create();
    const gravity = (
      engine as unknown as { gravity: { y: number; scale: number } }
    ).gravity;
    gravity.y = 1;
    gravity.scale = physics.gravity;
    const x = level.hoopX,
      y = level.hoopY;
    const ball = Bodies.circle(
      physics.origin.x,
      physics.origin.y,
      physics.ballRadius,
      { frictionAir: 0, restitution: 0.72, label: "ball" },
    );
    const g = getHoopGeometry(level);
    const bodies = [
      ball,
      Bodies.circle(x - g.rimHalfWidth, y, g.rimRadius, { isStatic: true }),
      Bodies.circle(x + g.rimHalfWidth, y, g.rimRadius, { isStatic: true }),
      Bodies.rectangle(x, g.boardTopY, g.boardWidth, g.boardThickness, {
        isStatic: true,
      }),
    ];
    for (const body of bodies)
      Composite.add(engine.world as unknown as MatterJS.CompositeType, body);
    // A fixed downward-arrival time defines a physically possible shot, without aim assistance in the game.
    const ticks = 80;
    const vx = (x - physics.origin.x) / ticks;
    const gravityPerTick = physics.gravity * (1000 / 60) ** 2;
    const vy =
      (y - physics.origin.y - 0.5 * gravityPerTick * ticks * (ticks + 0.5)) /
      ticks;
    expect(Math.hypot(vx, vy)).toBeLessThanOrEqual(physics.maxSpeed);
    Body.setVelocity(ball, { x: vx, y: vy });
    const detector = new BasketDetector(
      x,
      y,
      g.clearHalfWidth,
      physics.ballRadius,
    );
    let scored = false;
    for (let i = 0; i < 210; i++) {
      const previous = { ...ball.position };
      Engine.update(engine, physics.stepMs);
      if (detector.sample(previous, ball.position)) {
        scored = true;
        break;
      }
    }
    expect(scored).toBe(true);
    Engine.clear(engine);
  });
});

it("aim preview matches the actual fixed-step Matter flight before collisions", async () => {
  const { predictTrajectory } = await import("../domain/shooting/trajectory");
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
    { frictionAir: 0 },
  );
  Composite.add(engine.world as unknown as MatterJS.CompositeType, ball);
  const velocity = { x: 2.4, y: -14.1 };
  Body.setVelocity(ball, velocity);
  const preview = predictTrajectory(velocity, 64);
  for (const predicted of preview) {
    Engine.update(engine, physics.stepMs);
    expect(ball.position.x).toBeCloseTo(predicted.x, 6);
    expect(ball.position.y).toBeCloseTo(predicted.y, 6);
  }
  Engine.clear(engine);
});
