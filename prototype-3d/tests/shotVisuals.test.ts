import { beforeAll, it, expect } from "vitest";
import RAPIER from "@dimforge/rapier3d-compat";
import { config as c, BALL_GROUPS } from "../src/config";
import { solveBallistic, mapGesture } from "../src/domain/launch";
import {
  writePreviewPoints,
  createTrailBuffer,
  appendTrailSample,
  writeTrailPoints,
} from "../src/domain/shotVisuals";
import { initPhysics, createTestWorld } from "./helpers/rapierWorld";
beforeAll(initPhysics);
it("predicted dots agree with the real gravity flight to within half a ball radius", () => {
  const velocity = solveBallistic(
      c.ball.origin,
      c.hoop.center,
      c.launch.apex,
      c.gravity,
    ),
    out = new Float32Array(108);
  const { count } = writePreviewPoints(velocity, c, out);
  expect(count).toBeGreaterThan(20);
  const h = createTestWorld(c);
  h.ball.setLinvel(velocity, true);
  const samples = [{ position: { ...c.ball.origin }, time: 0 }];
  for (let i = 0; i < 165; i++) samples.push(h.step());
  for (let i = 0; i < count; i++) {
    const time = (out[i * 3 + 2] - c.ball.origin.z) / velocity.z;
    const actual = samples.reduce((a, b) =>
      Math.abs(a.time - time) < Math.abs(b.time - time) ? a : b,
    );
    expect(Math.abs(out[i * 3 + 1] - actual.position.y)).toBeLessThan(0.06);
  }
  expect(out[1]).toBeGreaterThan(c.ball.origin.y);
  expect(out[(count - 1) * 3 + 1]).toBeLessThan(c.hoop.center.y);
  h.dispose();
});
it("prediction stops at the physical board instead of drawing an invented rebound", () => {
  const h = createTestWorld(c);
  h.step();
  const shape = new RAPIER.Ball(c.ball.radius),
    out = new Float32Array(108);
  const v = mapGesture(
    {
      start: { x: 200, y: 620 },
      end: { x: 200, y: 620 - 712 * 0.46 },
      width: 400,
      height: 712,
      durationMs: 200,
    },
    c,
  )!.velocity;
  const result = writePreviewPoints(
    v,
    c,
    out,
    (from, to) =>
      h.world.castShape(
        from,
        { x: 0, y: 0, z: 0, w: 1 },
        { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z },
        shape,
        0,
        1,
        true,
        undefined,
        BALL_GROUPS,
      )?.time_of_impact ?? null,
  );
  expect(result.hit).toBe(true);
  expect(result.count).toBeLessThan(36);
  expect(out[(result.count - 1) * 3 + 2]).toBeGreaterThanOrEqual(-0.281);
  h.dispose();
});
it("a bounded trail retains observed rebounds and disappears with simulation time", () => {
  const trail = createTrailBuffer(4);
  for (let i = 0; i < 8; i++)
    appendTrailSample(
      trail,
      {
        position: { x: 0, y: 3 - i * 0.1, z: i < 6 ? -i * 0.1 : 0.1 * (i - 5) },
        velocity: { x: 0, y: -1, z: 1 },
        time: i * 0.05,
      },
      0.01,
    );
  const positions = new Float32Array(12),
    weights = new Float32Array(4);
  const count = writeTrailPoints(trail, 0.36, 0.3, positions, weights);
  expect(count).toBe(4);
  expect(positions[11]).toBeCloseTo(0.2);
  expect(weights[3]).toBeGreaterThan(weights[0]);
  expect(writeTrailPoints(trail, 1, 0.3, positions, weights)).toBe(0);
});
