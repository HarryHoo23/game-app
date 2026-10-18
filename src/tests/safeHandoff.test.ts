import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { createShot, sampleShot } from "../domain/shooting/ShotTrajectory";
import {
  calculateStats,
  initialProgress,
} from "../domain/progression/progress";
import { levels } from "../data/levels";
import { projectCourtPoint, projectShot } from "../data/courtPerspective";
import {
  contactGap,
  contactBounds,
  findMissContact,
  courtPose,
  advanceDeferred,
} from "../game/physics/SafeHandoff";
const require = createRequire(import.meta.url),
  Bodies = require("phaser/src/physics/matter-js/lib/factory/Bodies");
const shapes = [
  Bodies.circle(148, 285, 4, { label: "rim" }),
  Bodies.circle(252, 285, 4, { label: "rim" }),
  Bodies.rectangle(200, 194, 228, 7, { label: "backboard" }),
  Bodies.rectangle(86, 246, 7, 108, { label: "backboard" }),
  Bodies.rectangle(314, 246, 7, 108, { label: "backboard" }),
];
const plan = (dx: number, dy: number) =>
  createShot(dx, dy, levels[0], calculateStats(initialProgress()))!;
describe("controlled-to-Matter contact eligibility", () => {
  it("derives full frame clearance from actual bounds including half thickness", () => {
    expect(contactBounds(shapes, 14)).toMatchObject({
      minX: 68.5,
      maxX: 331.5,
      maxY: 314,
    });
    expect(contactGap({ x: 330, y: 255 }, 14, shapes)).toBeCloseTo(-1.5);
  });
  it("does not hand off to any collider during the foreground flight", () => {
    const p = plan(38, -125);
    expect(findMissContact(p, 0, 0.8, shapes, 14)).toBeNull();
  });
  it("sweeps a new late rim intersection to a safe point on the SAME projected trajectory", () => {
    const p = plan(38, -125),
      hit = findMissContact(p, 0.9, 1, shapes, 14)!;
    expect(hit).not.toBeNull();
    expect(hit.progress).toBeGreaterThan(0.9);
    expect(hit.progress).toBeLessThan(1);
    expect(contactGap(hit.pose, 14, shapes)).toBeGreaterThanOrEqual(0);
    const a = projectCourtPoint(hit.pose, p.rim),
      b = projectShot(sampleShot(p, hit.progress), p.rim);
    expect(a.x).toBeCloseTo(b.x, 9);
    expect(a.y).toBeCloseTo(b.y, 9);
  });
  it("does not rewind an overlap already present at the depth eligibility boundary", () => {
    const p = plan(80, -146);
    expect(contactGap(courtPose(p, 0.9), 14, shapes)).toBeLessThan(0);
    expect(findMissContact(p, 0.9, 1, shapes, 14)).toBeNull();
    let pose = courtPose(p, 1),
      steps = 0;
    while (contactGap(pose, 14, shapes) < 0.01 && steps++ < 20) {
      const old = pose;
      pose = advanceDeferred(pose, 1000 / 120);
      expect(pose.x).toBeGreaterThan(old.x);
      expect(pose.y).toBeGreaterThan(old.y);
      expect(Math.hypot(pose.x - old.x, pose.y - old.y)).toBeLessThan(5);
    }
    expect(steps).toBe(2);
    expect(contactGap(pose, 14, shapes)).toBeGreaterThan(0);
  });
  it("hands off exactly the rendered court-space velocity, without a projection jump", () => {
    const p = plan(38, -125),
      t = 0.94,
      pose = courtPose(p, t),
      dt = 1e-6;
    const a = projectShot(sampleShot(p, t - dt), p.rim),
      b = projectShot(sampleShot(p, t + dt), p.rim);
    expect(pose.velocity.y * 0.73).toBeCloseTo(
      ((b.y - a.y) / (2 * dt * p.durationMs)) * (1000 / 60),
      6,
    );
    expect(pose.t).toBe(1);
  });
});
