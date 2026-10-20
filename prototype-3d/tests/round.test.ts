import { it, expect } from "vitest";
import { createRound, advanceRound } from "../src/domain/round";
import {
  shootingSpots,
  createShootingSpots,
  TOTAL_SHOTS,
  orbitPose,
} from "../src/domain/spots";
import { createGameStore } from "../src/store";
import { createPlayerProgress, BEST_KEY } from "../src/domain/playerProgress";
it("five exact baseline/wing/top spots, two balls each, configurable radius/order and distinct camera headings", () => {
  expect(shootingSpots.map((s) => s.angle)).toEqual([0, 45, 90, 135, 180]);
  expect(TOTAL_SHOTS).toBe(10);
  expect(shootingSpots[2].origin).toEqual({ x: 0, y: 1.35, z: 4.2 });
  for (const s of shootingSpots) {
    expect(Math.hypot(s.origin.x, s.origin.z)).toBeCloseTo(4.2);
    expect(s.origin.z).toBeGreaterThanOrEqual(0);
    expect(s.camera.x * s.origin.x + s.camera.z * s.origin.z).toBeGreaterThan(
      0,
    );
    expect(
      s.basis.right.x * s.basis.forward.x + s.basis.right.z * s.basis.forward.z,
    ).toBeCloseTo(0);
  }
  expect(
    new Set(shootingSpots.map((s) => Math.atan2(s.camera.z, s.camera.x))).size,
  ).toBe(5);
  const reversed = createShootingSpots(
    5,
    [...shootingSpots].reverse().map((s) => s.id),
  );
  expect(reversed[0].id).toBe("right-corner");
  expect(Math.hypot(reversed[0].origin.x, reversed[0].origin.z)).toBeCloseTo(5);
  expect(() => createShootingSpots(1)).toThrow();
  expect(() => createShootingSpots(4, ["top"])).toThrow();
});
it("ten accepted and resolved shots visit exactly two balls per spot, three misses do not end the round, and outcomes score once", () => {
  let s = createRound(12);
  const visits = [];
  for (let i = 1; i <= 10; i++) {
    if (s.phase === "changingSpot")
      s = advanceRound(s, {
        type: "cameraReady",
        sessionId: 12,
        spotIndex: s.spotIndex,
      });
    visits.push([s.spotIndex, s.ballInSpot]);
    s = advanceRound(s, { type: "launch", sessionId: 12, shotId: i });
    expect(s.attempts).toBe(i);
    expect(s.phase).toBe("flying");
    expect(
      advanceRound(s, { type: "launch", sessionId: 12, shotId: i + 1 }),
    ).toBe(s);
    const result = i % 3 === 0 ? "swish" : "rim-miss";
    s = advanceRound(s, { type: "result", sessionId: 12, shotId: i, result });
    expect(
      advanceRound(s, {
        type: "result",
        sessionId: 12,
        shotId: i,
        result: "swish",
      }),
    ).toBe(s);
    if (i < 10) {
      expect(s.phase).toBe("resolving");
      s = advanceRound(s, { type: "settle", sessionId: 12 });
    } else expect(s.phase).toBe("completed");
  }
  expect(visits).toEqual([
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
    [2, 0],
    [2, 1],
    [3, 0],
    [3, 1],
    [4, 0],
    [4, 1],
  ]);
  expect(s).toMatchObject({ attempts: 10, makes: 3, finalScore: 3 });
  expect(s.outcomes.filter(Boolean)).toHaveLength(10);
  expect(advanceRound(s, { type: "launch", sessionId: 12, shotId: 11 })).toBe(
    s,
  );
  expect(advanceRound(s, { type: "pause" })).toBe(s);
});
it("camera gate, stale events, paused transition and aim cancellation are safe", () => {
  let s = createRound(1);
  expect(advanceRound(s, { type: "launch", sessionId: 1, shotId: 1 })).toBe(s);
  expect(
    advanceRound(s, { type: "cameraReady", sessionId: 0, spotIndex: 0 }),
  ).toBe(s);
  expect(
    advanceRound(s, { type: "cameraReady", sessionId: 1, spotIndex: 1 }),
  ).toBe(s);
  s = advanceRound(s, { type: "pause" });
  expect(s.phaseBeforePause).toBe("changingSpot");
  expect(
    advanceRound(s, { type: "cameraReady", sessionId: 1, spotIndex: 0 }),
  ).toBe(s);
  s = advanceRound(s, { type: "resume" });
  s = advanceRound(s, { type: "cameraReady", sessionId: 1, spotIndex: 0 });
  s = advanceRound(s, { type: "aim", active: true });
  s = advanceRound(s, { type: "pause" });
  s = advanceRound(s, { type: "resume" });
  expect(s.phase).toBe("ready");
  s = advanceRound(s, { type: "launch", sessionId: 1, shotId: 1 });
  expect(
    advanceRound(s, {
      type: "result",
      sessionId: 0,
      shotId: 1,
      result: "swish",
    }),
  ).toBe(s);
  expect(
    advanceRound(s, {
      type: "result",
      sessionId: 1,
      shotId: 2,
      result: "swish",
    }),
  ).toBe(s);
  expect(orbitPose(0, 45, 0, shootingSpots[1]).x).toBeCloseTo(-6.4);
  expect(orbitPose(0, 45, 1, shootingSpots[1])).toEqual(
    expect.objectContaining({ x: expect.any(Number) }),
  );
  const p = orbitPose(0, 45, 0.5, shootingSpots[1]);
  expect(Math.hypot(p.x, p.z)).toBeCloseTo(6.4);
});
it("completed-round best persists safely, practice stays unlimited, retry clears ten outcomes and rejects the old session", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  };
  const progress = createPlayerProgress(() => storage),
    store = createGameStore(progress, "challenge");
  for (let i = 1; i <= 10; i++) {
    let s = store.getState();
    if (s.phase === "changingSpot") s.cameraSettled(s.sessionId, s.spotIndex);
    s = store.getState();
    expect(s.recordLaunch(s.sessionId, i)).toBe(true);
    expect(s.recordResult(s.sessionId, i, i % 2 ? "swish" : "short")).toBe(
      true,
    );
    if (i < 10) {
      expect(values.get(BEST_KEY)).toBeUndefined();
      store.getState().settle(s.sessionId);
    }
  }
  const old = store.getState();
  expect(old).toMatchObject({
    makes: 5,
    best: 5,
    newBest: true,
    phase: "completed",
  });
  expect(values.get(BEST_KEY)).toBe("5");
  expect(createPlayerProgress(() => storage).readBest()).toBe(5);
  old.restart();
  const fresh = store.getState();
  expect(fresh).toMatchObject({
    sessionId: old.sessionId + 1,
    spotIndex: 0,
    ballInSpot: 0,
    attempts: 0,
    makes: 0,
    best: 5,
    newBest: false,
    finalScore: null,
    phase: "changingSpot",
  });
  expect(fresh.outcomes).toEqual(Array(10).fill(null));
  expect(fresh.recordResult(old.sessionId, 10, "swish")).toBe(false);
  fresh.startMode("practice");
  let s = store.getState();
  s.cameraSettled(s.sessionId, 0);
  for (let i = 1; i <= 30; i++) {
    s = store.getState();
    s.recordReady(s.sessionId);
    expect(s.recordLaunch(s.sessionId, i)).toBe(true);
    s.recordResult(s.sessionId, i, "short");
  }
  expect(store.getState()).toMatchObject({
    attempts: 30,
    makes: 0,
    best: 5,
    phase: "recovering",
  });
  const blocked = createPlayerProgress(() => {
    throw new Error("blocked");
  });
  expect(blocked.recordBest(8)).toBe(8);
  expect(blocked.recordBest(2)).toBe(8);
  expect(blocked.recordBest(11)).toBe(8);
});
