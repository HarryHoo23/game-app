import { describe, it, expect } from "vitest";
import { BasketDetector } from "../domain/scoring/basketDetector";
import { points, stars, LevelSession } from "../domain/levels/session";
import {
  initialProgress,
  completeLevel,
  purchaseUpgrade,
  calculateStats,
} from "../domain/progression/progress";
import { launchVector } from "../domain/shooting/launch";
import { levels } from "../data/levels";
import { ProgressStore } from "../services/storage";

describe("basket crossing", () => {
  const make = () => new BasketDetector(200, 300, 40, 12);
  it("confirms only downward passage and scores once", () => {
    const d = make();
    expect(d.sample({ x: 200, y: 270 }, { x: 200, y: 305 })).toBe(false);
    expect(d.sample({ x: 200, y: 305 }, { x: 200, y: 330 })).toBe(true);
    expect(d.sample({ x: 200, y: 290 }, { x: 200, y: 340 })).toBe(false);
  });
  it("handles a fast crossing in one step", () =>
    expect(make().sample({ x: 200, y: 260 }, { x: 200, y: 350 })).toBe(true));
  it("rejects upward, underside, side entry and insufficient clearance", () => {
    expect(make().sample({ x: 200, y: 350 }, { x: 200, y: 260 })).toBe(false);
    expect(make().sample({ x: 200, y: 305 }, { x: 200, y: 350 })).toBe(false);
    expect(make().sample({ x: 260, y: 290 }, { x: 200, y: 350 })).toBe(false);
    expect(make().sample({ x: 235, y: 270 }, { x: 235, y: 350 })).toBe(false);
  });
  it("rejects a ground bounce", () => {
    const d = make();
    d.invalidate();
    expect(d.sample({ x: 200, y: 260 }, { x: 200, y: 350 })).toBe(false);
  });
});
describe("level rules", () => {
  it("classifies exclusive scores and exact star boundaries", () => {
    expect(points(true, true)).toBe(2);
    expect(points(false, false)).toBe(3);
    expect(points(false, true)).toBe(4);
    expect([9, 10, 11, 12, 13, 14].map((s) => stars(s, 10))).toEqual([
      0, 1, 1, 2, 2, 3,
    ]);
  });
  it("waits for final flight and rejects a second launch", () => {
    const s = new LevelSession({ ...levels[0], totalShots: 1 });
    expect(s.launch()).toBe(true);
    expect(s.launch()).toBe(false);
    expect(s.finished).toBe(false);
    s.resolve(4);
    expect(s.finished).toBe(true);
    expect(s.score).toBe(4);
    s.resolve(4);
    expect(s.score).toBe(4);
  });
  it("continues after target for stars", () => {
    const s = new LevelSession({ ...levels[0], targetScore: 2, totalShots: 2 });
    s.launch();
    s.resolve(4);
    expect(s.finished).toBe(false);
  });
});
describe("progress and upgrades", () => {
  it("awards once, preserves best stars and unlocks only existing levels", () => {
    const p = initialProgress();
    const result = { runId: "one", levelId: 1, score: 14 };
    const next = completeLevel(p, result);
    expect(next.coins).toBeGreaterThan(0);
    expect(next.stars[1]).toBe(3);
    expect(next.highestUnlockedLevel).toBe(2);
    expect(completeLevel(next, result)).toEqual(next);
    expect(
      completeLevel(next, { ...result, runId: "two", score: 10 }).stars[1],
    ).toBe(3);
    const end = completeLevel(
      { ...p, highestUnlockedLevel: 10 },
      { runId: "last", levelId: 10, score: 999 },
    );
    expect(end.highestUnlockedLevel).toBe(10);
  });
  it("does not pay failed or locked levels", () => {
    const p = initialProgress();
    expect(
      completeLevel(p, { runId: "fail", levelId: 1, score: 0 }).coins,
    ).toBe(0);
    expect(
      completeLevel(p, { runId: "locked", levelId: 3, score: 999 }),
    ).toEqual(p);
  });
  it("purchases atomically and rejects insufficient funds or max level", () => {
    const p = initialProgress();
    expect(purchaseUpgrade(p, "shoes")).toEqual(p);
    const n = purchaseUpgrade({ ...p, coins: 100 }, "shoes");
    expect(n.coins).toBe(0);
    expect(n.equipment.shoes).toBe(2);
    expect(
      purchaseUpgrade(
        { ...n, coins: 9999, equipment: { ...n.equipment, shoes: 5 } },
        "shoes",
      ).coins,
    ).toBe(9999);
  });
  it("modest equipment cannot change maximum power", () => {
    const base = calculateStats(initialProgress());
    const full = calculateStats({
      ...initialProgress(),
      equipment: { shoes: 5, sleeve: 5, ball: 5, hoop: 5 },
    });
    expect(full.maxSpeed).toBe(base.maxSpeed);
    expect(full.perfectTolerance).toBeGreaterThan(base.perfectTolerance);
    expect(launchVector(0, -200, base)?.y).toBeLessThan(0);
    expect(launchVector(1, 1, base)).toBeNull();
  });
});
describe("storage", () => {
  function memory(value: string | null = null) {
    return {
      getItem: () => value,
      setItem: (_k: string, v: string) => {
        value = v;
      },
    };
  }
  it("round trips and falls back on corrupted saves", () => {
    const store = new ProgressStore(memory());
    store.save({ ...initialProgress(), coins: 123 });
    expect(store.load().coins).toBe(123);
    expect(new ProgressStore(memory("{bad")).load().coins).toBe(0);
  });
  it("validates values and protects future saves", () => {
    expect(
      new ProgressStore(
        memory(JSON.stringify({ ...initialProgress(), coins: -1 })),
      ).load().coins,
    ).toBe(0);
    const future = new ProgressStore(memory('{"schemaVersion":99}'));
    future.load();
    expect(() => future.save(initialProgress())).toThrow();
  });
  it("reports write failure", () => {
    const s = new ProgressStore({
      getItem: () => null,
      setItem: () => {
        throw Error("full");
      },
    });
    expect(() => s.save(initialProgress())).toThrow();
  });
});

it("makes three stars mathematically reachable with starter equipment on every court", () => {
  for (const level of levels)
    expect(level.totalShots * 4).toBeGreaterThanOrEqual(
      Math.ceil(level.targetScore * 1.4),
    );
});
