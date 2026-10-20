import { readFileSync } from "node:fs";
import { beforeAll, it, expect } from "vitest";
import { initPhysics, createTestWorld } from "./helpers/rapierWorld";
import { config as c } from "../src/config";
import { shootingSpots, practiceSpot } from "../src/domain/spots";
import { mapGesture } from "../src/domain/launch";
import { createBasketState, advanceBasket } from "../src/domain/scoring";
import { writePreviewPoints } from "../src/domain/shotVisuals";
import { createShotFeedback } from "../src/domain/shotFeedback";
const gesture = (up: number, dx = 0) => ({
  start: { x: 200, y: 620 },
  end: { x: 200 + dx * 400, y: 620 - up * 712 },
  width: 400,
  height: 712,
  durationMs: 240,
});
beforeAll(initPhysics);
for (const spot of shootingSpots) {
  it(`actual Rapier ${spot.name}: neutral swipe, local aim, oriented spin, downward score and net/audio`, () => {
    const launch = mapGesture(gesture(0.3), c, spot)!;
    const h = createTestWorld(c, spot.origin);
    h.ball.setLinvel(launch.velocity, true);
    h.ball.setAngvel(launch.angularVelocity, true);
    expect(Math.hypot(...Object.values(launch.angularVelocity))).toBeCloseTo(7);
    expect(
      launch.angularVelocity.x * launch.velocity.x +
        launch.angularVelocity.z * launch.velocity.z,
    ).toBeCloseTo(0);
    const left = mapGesture(gesture(0.3, -0.18), c, spot)!,
      right = mapGesture(gesture(0.3, 0.18), c, spot)!;
    const rightward =
      (right.velocity.x - left.velocity.x) * spot.basis.right.x +
      (right.velocity.z - left.velocity.z) * spot.basis.right.z;
    expect(rightward).toBeGreaterThan(0.2);
    expect(mapGesture(gesture(0.3, 0.01), c, spot)!.velocity).toEqual(
      launch.velocity,
    );
    const points = new Float32Array(108);
    writePreviewPoints(launch.velocity, c, points, undefined, spot.origin);
    expect(points[0]).toBeCloseTo(
      spot.origin.x + launch.velocity.x * c.shotVisuals.preview.startTime,
      5,
    );
    let prev = {
        time: 0,
        position: { ...spot.origin },
        velocity: { ...launch.velocity },
      },
      state = createBasketState(),
      makes = 0,
      makeAt = 0;
    const sounds: string[] = [],
      f = createShotFeedback({ play: (k) => sounds.push(k) });
    f.launch(1);
    for (let i = 0; i < 240; i++) {
      const next = h.step();
      f.step(next.time);
      f.passage(1, prev, next);
      const a = advanceBasket(
        state,
        prev,
        next,
        h.contacts.some((k) => k.kind === "floor"),
        c,
      );
      state = a.state;
      if (a.made) {
        expect(next.velocity.y).toBeLessThan(0);
        makes++;
        makeAt = next.time;
        f.result(1, "swish", next, next.time);
      }
      prev = next;
    }
    expect(makes).toBe(1);
    expect(h.contacts.filter((k) => k.time < makeAt)).toEqual([]);
    expect(sounds.filter((k) => k === "swish")).toHaveLength(1);
    expect(f.snapshot().passages[0].at).toBeLessThan(makeAt);
    expect(f.pose.stretch).toBe(0);
    h.dispose();
  });
  it(`real rim and board rebounds at ${spot.name}`, () => {
    // Fixed real-contact regressions, discovered during initial geometry checks.
    const boardDx: Record<string, number> = {
      "left-corner": -0.3,
      "left-wing": -0.4,
      top: -0.4,
      "right-wing": -0.1,
      "right-corner": 0.2,
    };
    for (const [kind, up, dx] of [
      ["rim", 0.15, 0],
      ["board", 0.55, boardDx[spot.id]],
    ] as const) {
      const h = createTestWorld(c, spot.origin),
        launch = mapGesture(gesture(up, dx), c, spot)!;
      h.ball.setLinvel(launch.velocity, true);
      h.ball.setAngvel(launch.angularVelocity, true);
      for (let i = 0; i < 300 && !h.contacts.some((k) => k.kind === kind); i++)
        h.step();
      const contact = h.contacts.find((k) => k.kind === kind);
      expect(contact).toBeDefined();
      expect(
        Math.hypot(
          contact!.after.x - contact!.before.x,
          contact!.after.y - contact!.before.y,
          contact!.after.z - contact!.before.z,
        ),
      ).toBeGreaterThan(0.2);
      expect(Object.values(h.ball.angvel()).every(Number.isFinite)).toBe(true);
      h.dispose();
    }
  });
}
it("straight frontal launch and spin stay unchanged; ascending passage cannot score", () => {
  const baseline = JSON.parse(
    readFileSync(
      new URL(
        "../docs/verification/acceptance-2026-10-19/after/traces/clean-swish.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ).shot;
  const l = mapGesture(baseline.gesture, c, practiceSpot)!;
  expect(l.angularVelocity).toEqual({ x: -7, y: 0, z: 0 });
  expect(l.velocity).toEqual(baseline.launch.velocity);
  for (const spot of shootingSpots) {
    const h = createTestWorld(c, { x: 0, y: 2.7, z: 0 });
    h.ball.setLinvel({ x: 0, y: 3, z: 0 }, true);
    let prev = {
        time: 0,
        position: { x: 0, y: 2.7, z: 0 },
        velocity: { x: 0, y: 3, z: 0 },
      },
      state = createBasketState();
    for (let i = 0; i < 30; i++) {
      const next = h.step();
      const a = advanceBasket(state, prev, next, false, c);
      expect(a.made, spot.id).toBe(false);
      state = a.state;
      prev = next;
    }
    h.dispose();
  }
});
