import { describe, it, expect } from "vitest";
import {
  createShot,
  sampleShot,
  assessShot,
  predictShot,
  type ShotPlan,
} from "../domain/shooting/ShotTrajectory";
import { ShotController } from "../domain/shooting/ShotController";
import {
  calculateStats,
  initialProgress,
} from "../domain/progression/progress";
import { levels } from "../data/levels";
import { physics } from "../data/physics";
const stats = calculateStats(initialProgress());
const plan = () => createShot(0, -146, levels[0], stats)!;
describe("controlled 2.5D flight", () => {
  it("travels from player to hoop depth in .88 seconds, along configured parabola", () => {
    const p = plan(),
      start = sampleShot(p, 0),
      end = sampleShot(p, 1),
      mid = sampleShot(p, 0.5);
    expect(p.durationMs).toBe(880);
    expect(start.x).toBe(physics.origin.x);
    expect(start.y).toBe(physics.origin.y);
    expect(end.x).toBe(levels[0].hoopX);
    expect(end.y).toBeCloseTo(levels[0].hoopY);
    expect(mid.y).toBeCloseTo((p.start.y + p.target.y) / 2 - p.arcHeight);
    expect(end.velocity.y).toBeGreaterThan(0);
  });
  it("smoothly shrinks to 45% and applies two backwards rotations", () => {
    const p = plan(),
      a = sampleShot(p, 0),
      b = sampleShot(p, 0.5),
      c = sampleShot(p, 1);
    expect(a.scale).toBe(1);
    expect(c.scale).toBeCloseTo(0.45);
    expect(b.scale).toBeGreaterThan(c.scale);
    expect(b.scale).toBeLessThan(a.scale);
    expect(c.rotation).toBeCloseTo(-Math.PI * 4);
  });
  it("separates lateral aim from power and bounds both", () => {
    const a = plan(),
      b = createShot(12, -146, levels[0], stats)!,
      far = createShot(1000, -1000, levels[0], stats)!;
    expect(b.target.x).toBeGreaterThan(a.target.x);
    expect(far.target.x).toBeLessThanOrEqual(physics.origin.x + 130);
    expect(far.durationMs).toBeGreaterThanOrEqual(750);
    expect(far.durationMs).toBeLessThanOrEqual(1050);
    expect(createShot(0, -3, levels[0], stats)).toBeNull();
    expect(createShot(0, 100, levels[0], stats)).toBeNull();
  });
  it("does not turn weak, strong, or sideways shots into makes, even with max gear", () => {
    const premium = calculateStats({
      ...initialProgress(),
      equipment: { shoes: 5, sleeve: 5, ball: 5, hoop: 5 },
    });
    for (const s of [stats, premium])
      for (const [dx, dy] of [
        [0, -70],
        [0, -230],
        [45, -146],
        [-45, -146],
      ])
        expect(
          assessShot(createShot(dx, dy, levels[0], s)!, levels[0], s).made,
        ).toBe(false);
    expect(assessShot(plan(), levels[0], stats)).toMatchObject({
      made: true,
      score: 4,
    });
  });
  it("preserves normal/swish/perfect classifications and contact types", () => {
    const p = plan();
    const shifted = (x: number, y: number): ShotPlan => ({
      ...p,
      target: { x: p.target.x + x, y: p.target.y + y },
    });
    expect(assessShot(shifted(9, 0), levels[0], stats).score).toBe(3);
    expect(assessShot(shifted(13, 0), levels[0], stats).score).toBe(2);
    expect(assessShot(shifted(0, 26), levels[0], stats).impact).toBe(
      "frontRim",
    );
    expect(assessShot(shifted(0, -26), levels[0], stats).impact).toBe(
      "backRim",
    );
    expect(assessShot(shifted(0, -60), levels[0], stats).impact).toBe(
      "backboard",
    );
  });
  it("provides nine preview dots on the exact flight, not a different curve", () => {
    const p = plan(),
      dots = predictShot(p);
    expect(dots).toHaveLength(9);
    for (const d of dots) expect(d).toEqual(sampleShot(p, d.t));
  });
});
describe("shot lifecycle", () => {
  it("reports hoop arrival exactly once and only after completing the flight", () => {
    const c = new ShotController();
    expect(c.launch(plan())).toBe(true);
    expect(c.launch(plan())).toBe(false);
    expect(c.advance(879).arrived).toBe(false);
    expect(c.advance(1).arrived).toBe(true);
    expect(c.advance(200).arrived).toBe(false);
  });
  it("is frame-rate independent and pauses simply by not advancing", () => {
    const a = new ShotController(),
      b = new ShotController();
    a.launch(plan());
    b.launch(plan());
    a.advance(440);
    for (let i = 0; i < 44; i++) b.advance(10);
    expect(a.pose).toEqual(b.pose);
    const before = a.pose;
    expect(a.pose).toEqual(before);
    a.reset();
    expect(a.active).toBe(false);
  });
  it.each(levels)(
    "allows starter gear to make court $id without altering its target",
    (l) => {
      expect(assessShot(createShot(0, -146, l, stats)!, l, stats).made).toBe(
        true,
      );
    },
  );
});

it("uses subtle aim compression and a 100ms release stretch that fully restores", async () => {
  const { ballDeformation } = await import("../domain/shooting/BallAnimation");
  const aim = ballDeformation(1, null);
  expect(aim.y).toBeLessThan(1);
  expect(aim.y).toBeGreaterThan(0.94);
  const release = ballDeformation(0, 50);
  expect(release.y).toBeGreaterThan(1);
  expect(release.y).toBeLessThan(1.1);
  expect(ballDeformation(0, 100)).toEqual({ x: 1, y: 1 });
  expect(ballDeformation(0, 0)).toEqual({ x: 1, y: 1 });
});
