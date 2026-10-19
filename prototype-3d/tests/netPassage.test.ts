import { beforeAll, expect, it, vi } from "vitest";
import { createShotFeedback } from "../src/domain/shotFeedback";
import { config as c } from "../src/config";
import { initPhysics, createTestWorld } from "./helpers/rapierWorld";
import { solveBallistic } from "../src/domain/launch";
import { advanceBasket, createBasketState } from "../src/domain/scoring";
import type { Sample } from "../src/domain/types";
beforeAll(initPhysics);
it("actual descending entry responds before scoring; net brush never awards a point or celebration", () => {
  const h = createTestWorld(c),
    audio = { play: vi.fn() },
    f = createShotFeedback(audio);
  h.ball.setLinvel(
    solveBallistic(c.ball.origin, c.hoop.center, c.launch.apex, c.gravity),
    true,
  );
  h.ball.setAngvel({ x: c.ball.backspin, y: 0, z: 0 }, true);
  f.launch(1);
  let state = createBasketState(),
    prev: Sample = {
      time: 0,
      position: { ...c.ball.origin },
      velocity: { ...h.ball.linvel() },
    };
  let entryAt = 0,
    madeAt = 0,
    firstMotion = 0,
    makes = 0;
  for (let i = 0; i < 240; i++) {
    const next = h.step();
    f.step(next.time);
    f.passage(1, prev, next);
    const a = advanceBasket(state, prev, next, false, c);
    state = a.state;
    if (f.snapshot().passages.length && !entryAt) entryAt = next.time;
    if (f.pose.stretch > 0.0001 && !firstMotion) firstMotion = next.time;
    if (a.made) {
      makes++;
      madeAt = next.time;
      f.result(1, "swish", next, next.time);
    }
    prev = next;
  }
  expect(entryAt).toBeGreaterThan(0);
  expect(firstMotion).toBeLessThan(madeAt);
  expect(makes).toBe(1);
  const events = f.snapshot().events;
  expect(events.find((e) => e.kind === "net")!.at).toBeLessThan(
    events.find((e) => e.kind === "swish")!.at,
  );
  expect(events.find((e) => e.kind === "swish")!.at).toBe(madeAt);
  expect(f.pose.stretch).toBe(0);
  h.dispose();
  f.reset();
  f.launch(2);
  const brush = {
    ...prev,
    position: { x: 0.3, y: 3.06, z: 0 },
    velocity: { x: 0.5, y: -3, z: 0 },
  };
  f.step(3);
  f.passage(2, { ...brush, position: { ...brush.position, y: 3.2 } }, brush);
  expect(f.snapshot().passages).toHaveLength(1);
  expect(f.net).toBeNull();
  expect(
    f.snapshot().events.some((e) => e.kind === "swish" || e.kind === "make"),
  ).toBe(false);
  f.reset();
  expect(f.pose.stretch).toBe(0);
  expect(f.snapshot().passages).toEqual([]);
});
