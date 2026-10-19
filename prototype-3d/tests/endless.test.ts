import { expect, it } from "vitest";
import { createGameStore } from "../src/store";
import {
  BEST_KEY,
  TUTORIAL_KEY,
  createPlayerProgress,
} from "../src/domain/playerProgress";
import { createPracticeLifecycle } from "../src/domain/practice";
import { config } from "../src/config";
import type { ShotResult } from "../src/domain/shot";

function setup() {
  const values = new Map<string, string>();
  const storage = {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  };
  const progress = createPlayerProgress(() => storage);
  const store = createGameStore(progress, "endless");
  const result = (id: number, outcome: ShotResult) => {
    const s = store.getState();
    s.recordReady(s.sessionId);
    expect(s.recordLaunch(s.sessionId, id)).toBe(true);
    return s.recordResult(s.sessionId, id, outcome);
  };
  return { store, result, values, storage, progress };
}
it("each confirmed make type scores once; each failed outcome consumes exactly one miss", () => {
  const { store, result } = setup();
  for (const [i, outcome] of (
    ["swish", "rim-make", "board-make"] as const
  ).entries()) {
    result(i + 1, outcome);
    const s = store.getState();
    expect(s.makes).toBe(i + 1);
    expect(s.missesLeft).toBe(3);
    expect(s.recordResult(s.sessionId, i + 1, "swish")).toBe(false);
    expect(store.getState().makes).toBe(i + 1);
  }
  for (const outcome of [
    "short",
    "long",
    "left",
    "right",
    "rim-miss",
    "board-miss",
    "miss",
  ] as const) {
    store.getState().restart();
    result(1, outcome);
    const s = store.getState();
    expect(s.makes).toBe(0);
    expect(s.missesLeft).toBe(2);
    expect(s.recordResult(s.sessionId, 1, outcome)).toBe(false);
    expect(s.recordResult(s.sessionId, 1, "swish")).toBe(false);
    expect(store.getState().missesLeft).toBe(2);
    expect(store.getState().makes).toBe(0);
  }
});
it("third resolved miss ends the run, rejects ready/launch/results/pause and retries immediately", () => {
  const { store, result } = setup();
  result(1, "swish");
  result(2, "short");
  result(3, "rim-miss");
  expect(store.getState().phase).toBe("recovering");
  result(4, "board-miss");
  const end = store.getState();
  expect(end).toMatchObject({
    phase: "gameover",
    attempts: 4,
    makes: 1,
    missesLeft: 0,
    best: 1,
  });
  end.recordReady(end.sessionId);
  end.setAiming(true);
  end.pause();
  end.resume();
  expect(end.recordLaunch(end.sessionId, 5)).toBe(false);
  expect(end.recordResult(end.sessionId, 4, "swish")).toBe(false);
  expect(store.getState()).toMatchObject({
    phase: "gameover",
    attempts: 4,
    makes: 1,
    missesLeft: 0,
  });
  end.restart();
  expect(store.getState()).toMatchObject({
    sessionId: end.sessionId + 1,
    phase: "ready",
    phaseBeforePause: "ready",
    attempts: 0,
    makes: 0,
    missesLeft: 3,
    best: 1,
    feedback: null,
    currentShotId: null,
    resolved: false,
  });
  expect(store.getState().recordLaunch(store.getState().sessionId, 1)).toBe(
    true,
  );
});
it("late events from old runs, reused shot IDs and mismatched active shots are rejected", () => {
  const { store, result } = setup();
  result(1, "swish");
  const old = store.getState().sessionId;
  store.getState().restart();
  const s = store.getState();
  s.recordLaunch(s.sessionId, 1);
  expect(s.recordResult(old, 1, "swish")).toBe(false);
  expect(s.recordResult(s.sessionId, 2, "short")).toBe(false);
  s.recordReady(s.sessionId);
  expect(store.getState().phase).toBe("flying");
  s.recordResult(s.sessionId, 1, "swish");
  s.recordReady(s.sessionId);
  expect(s.recordLaunch(s.sessionId, 1)).toBe(false);
  expect(store.getState()).toMatchObject({
    makes: 1,
    missesLeft: 3,
    attempts: 1,
  });
  store.getState().startMode("practice");
  expect(store.getState().recordResult(s.sessionId, 1, "short")).toBe(false);
});
it("best persists only from Endless makes, survives new stores and never decreases", () => {
  const { store, result, values, storage } = setup();
  result(1, "swish");
  result(2, "rim-make");
  expect(values.get(BEST_KEY)).toBe("2");
  const fresh = createGameStore(
    createPlayerProgress(() => storage),
    "endless",
  );
  expect(fresh.getState().best).toBe(2);
  store.getState().restart();
  result(1, "swish");
  expect(values.get(BEST_KEY)).toBe("2");
  store.getState().startMode("practice");
  for (let i = 1; i <= 30; i++) result(i, i % 2 ? "swish" : "short");
  expect(store.getState()).toMatchObject({
    mode: "practice",
    attempts: 30,
    makes: 15,
    missesLeft: 3,
    best: 2,
  });
  expect(values.get(BEST_KEY)).toBe("2");
});
it("blocked storage getter or writes retain in-memory best without blocking play", () => {
  for (const access of [
    () => {
      throw new Error("denied getter");
    },
    () => ({
      getItem: () => {
        throw new Error("denied read");
      },
      setItem: () => {
        throw new Error("quota");
      },
    }),
  ]) {
    const p = createPlayerProgress(access);
    expect(p.recordBest(7)).toBe(7);
    expect(p.recordBest(2)).toBe(7);
    expect(p.readBest()).toBe(7);
    p.learnSwipe();
    expect(p.hasLearnedSwipe()).toBe(true);
    const s = createGameStore(p, "endless");
    s.getState().recordLaunch(1, 1);
    s.getState().recordResult(1, 1, "swish");
    s.getState().restart();
    expect(s.getState().best).toBe(7);
  }
});
it("corrupt stored best is ignored; valid larger stored best is retained", () => {
  for (const value of [
    "-1",
    "NaN",
    "Infinity",
    "1.5",
    "abc",
    "999999999999999999999999",
  ]) {
    const p = createPlayerProgress(() => ({
      getItem: () => value,
      setItem: () => {},
    }));
    expect(p.readBest()).toBe(0);
    expect(p.recordBest(2)).toBe(2);
  }
  const { values, progress } = setup();
  values.set(BEST_KEY, "42");
  expect(progress.recordBest(2)).toBe(42);
});
it("tutorial is non-blocking, learned only by an accepted launch and persists", () => {
  const { store, values, storage } = setup();
  const s = store.getState();
  expect(s.tutorialVisible).toBe(true);
  s.pause();
  expect(s.recordLaunch(s.sessionId, 1)).toBe(false);
  expect(values.has(TUTORIAL_KEY)).toBe(false);
  s.resume();
  s.recordLaunch(s.sessionId, 1);
  expect(store.getState().tutorialVisible).toBe(false);
  expect(values.get(TUTORIAL_KEY)).toBe("1");
  expect(
    createGameStore(createPlayerProgress(() => storage)).getState()
      .tutorialVisible,
  ).toBe(false);
});
it("Endless pause cancels aim, rejects shots while paused and resumes the same flight", () => {
  const { store } = setup();
  const s = store.getState();
  s.setAiming(true);
  s.pause();
  s.resume();
  expect(store.getState().phase).toBe("ready");
  s.recordLaunch(s.sessionId, 1);
  s.pause();
  expect(s.recordLaunch(s.sessionId, 2)).toBe(false);
  expect(s.recordResult(s.sessionId, 1, "short")).toBe(false);
  s.resume();
  expect(store.getState().phase).toBe("flying");
  s.recordResult(s.sessionId, 1, "short");
  expect(store.getState().missesLeft).toBe(2);
});
it("finishing cancels pending recovery without changing resolved ball flight", () => {
  const life = createPracticeLifecycle(config),
    id = life.launch()!;
  life.resolve(id, "short");
  life.finish();
  expect(life.launch()).toBeNull();
  life.step(0.2);
  expect(life.readyId).toBeNull();
  expect(life.balls).toHaveLength(1);
  expect(life.resolve(id, "swish")).toBe(false);
  life.step(6);
  expect(life.balls).toHaveLength(0);
});
