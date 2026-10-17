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
import { shotFeel } from "../data/shotFeel";
import { projectShot } from "../game/presentation/perspective";
const stats = calculateStats(initialProgress());
const plan = () => createShot(0, -146, levels[0], stats)!;
describe("controlled 2.5D flight", () => {
  it("travels from player to hoop depth in .80 seconds with exact endpoints", () => {
    const p = plan(),
      start = sampleShot(p, 0),
      end = sampleShot(p, 1),
      mid = sampleShot(p, 0.5);
    expect(p.durationMs).toBe(800);
    expect(start.x).toBe(physics.origin.x);
    expect(start.y).toBe(physics.origin.y);
    expect(end.x).toBe(levels[0].hoopX);
    expect(end.y).toBeCloseTo(levels[0].hoopY - shotFeel.hoopApproachOffset);
    expect(mid.y).toBeLessThan(end.y);
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
    expect(far.durationMs).toBeGreaterThanOrEqual(700);
    expect(far.durationMs).toBeLessThanOrEqual(950);
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
    expect(c.advance(799).arrived).toBe(false);
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

describe("visible flight after perspective", () => {
  it("reaches its screen apex around 44%, with a readable final descent", () => {
    const p = plan(),
      rim = { x: levels[0].hoopX, y: levels[0].hoopY };
    const samples = Array.from({ length: 1001 }, (_, i) =>
      projectShot(sampleShot(p, i / 1000), rim),
    );
    const apex =
      samples.reduce(
        (best, point, i) => (point.y < samples[best].y ? i : best),
        0,
      ) / 1000;
    expect(apex).toBeGreaterThanOrEqual(0.4);
    expect(apex).toBeLessThanOrEqual(0.48);
    expect(apex).toBeLessThan(0.5);
    expect(apex).toBeCloseTo(0.44, 2);
    // Keep most of the ball beneath the HUD; its upper edge may overlap it slightly.
    expect(samples[Math.round(apex * 1000)].y).toBeGreaterThanOrEqual(184);
    for (let i = 650; i < 1000; i++)
      expect(samples[i + 1].y).toBeGreaterThan(samples[i].y);
    expect(samples[1000].y - samples[650].y).toBeGreaterThan(25);
  });
  it("keeps projected previews identical to deterministic flight samples", () => {
    const a = plan(),
      b = plan(),
      rim = { x: levels[0].hoopX, y: levels[0].hoopY };
    expect(a).toEqual(b);
    for (const dot of predictShot(a)) {
      expect(projectShot(dot, rim)).toEqual(
        projectShot(sampleShot(b, dot.t), rim),
      );
    }
  });
  it("reports the actual continuous derivative through apex and arrival", () => {
    const p = plan(),
      h = 0.000001;
    for (const t of [0.2, 0.44, 0.65, 1]) {
      const before = sampleShot(p, t - h),
        at = sampleShot(p, t);
      const unitsPerTick = 1000 / 60 / (h * p.durationMs);
      expect((at.y - before.y) * unitsPerTick).toBeCloseTo(at.velocity.y, 3);
    }
  });
});
