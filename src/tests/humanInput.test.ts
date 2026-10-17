import { describe, expect, it } from "vitest";
import { createShot, assessShot } from "../domain/shooting/ShotTrajectory";
import { levels } from "../data/levels";
import {
  calculateStats,
  initialProgress,
} from "../domain/progression/progress";

const level = levels[0],
  stats = calculateStats(initialProgress());
const plan = (dx: number, dy = -146) => createShot(dx, dy, level, stats)!;

describe("human input interpretation", () => {
  it("takes power only from vertical travel, including moderate lateral drift", () => {
    for (const dx of [-130, -25, -15, 0, 15, 25, 130]) {
      expect(plan(dx).power).toBe(plan(0).power);
      expect(plan(dx).target.y).toBe(plan(0).target.y);
    }
  });
  it("absorbs eight pixels of finger drift without moving the target", () => {
    for (const dx of [-8, -4, 0, 4, 8])
      expect(plan(dx).target.x).toBe(plan(0).target.x);
  });
  it("makes a fifteen pixel drift forgiving while keeping intentional aim", () => {
    expect(assessShot(plan(15), level, stats).made).toBe(true);
    expect(assessShot(plan(-15), level, stats).made).toBe(true);
    expect(assessShot(plan(25), level, stats).made).toBe(false);
    expect(assessShot(plan(-25), level, stats).made).toBe(false);
  });
  it("maps aim symmetrically, monotonically, and caps horizontal range", () => {
    let previous = plan(0).target.x;
    for (let dx = 0; dx <= 160; dx++) {
      const offset = plan(dx).target.x - plan(0).target.x;
      expect(plan(-dx).target.x - plan(0).target.x).toBeCloseTo(-offset, 12);
      expect(plan(dx).target.x).toBeGreaterThanOrEqual(previous);
      expect(offset).toBeLessThanOrEqual(130);
      previous = plan(dx).target.x;
    }
    expect(plan(1000).target.x - plan(0).target.x).toBe(130);
  });
  it("preserves weak and strong power misses", () => {
    expect(plan(0, -40).power).toBeLessThan(0.3);
    expect(plan(0, -250).power).toBe(1);
    expect(assessShot(plan(0, -40), level, stats).made).toBe(false);
    expect(assessShot(plan(0, -250), level, stats).made).toBe(false);
    expect(createShot(200, -12, level, stats)).toBeNull();
  });
});

describe("raw gesture endpoints", () => {
  it("gives identical final plans for 0/5/12/30 move samples with equipment smoothing", async () => {
    const { ShotGesture } = await import("../game/input/shotGesture");
    const start = { x: 192, y: 673 },
      end = { x: 207, y: 527 };
    const equipped = { ...stats, smoothing: 0.45 };
    const releases = [0, 5, 12, 30].map((count) => {
      const gesture = new ShotGesture(start, equipped.smoothing);
      for (let i = 1; i <= count; i++)
        gesture.move({
          x: start.x + ((end.x - start.x) * i) / count,
          y: start.y + ((end.y - start.y) * i) / count,
        });
      const { dx, dy } = gesture.release(end);
      return createShot(dx, dy, level, equipped);
    });
    releases.forEach((release) => expect(release).toEqual(releases[0]));
    expect(releases[0]).toEqual(createShot(15, -146, level, equipped));
  });
});

describe("seeded human gesture coverage", () => {
  it("repeats the same gestures and classifications while retaining skill misses", async () => {
    const { humanGestures } = await import("../../scripts/lib/humanized");
    const evaluate = () =>
      humanGestures().map(({ dx, dy }) => {
        const shot = plan(dx, dy);
        return {
          power: shot.power,
          target: shot.target,
          result: assessShot(shot, level, stats),
        };
      });
    const first = evaluate();
    expect(first).toHaveLength(1000);
    expect(evaluate()).toEqual(first);
    expect(first.some(({ result }) => result.made)).toBe(true);
    expect(first.some(({ result }) => !result.made)).toBe(true);
    expect(first.some(({ result }) => result.quality === "normal")).toBe(true);
    expect(first.some(({ result }) => result.quality === "swish")).toBe(true);
    expect(first.some(({ result }) => result.quality === "perfect")).toBe(true);
  });
});
