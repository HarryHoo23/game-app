import { describe, it, expect } from "vitest";
import {
  ballContactRadius,
  ballScreenRadius,
  ballDisplaySize,
  ballProfile,
} from "../data/ballGeometry";
import { PERSPECTIVE_CONFIG } from "../data/courtPerspective";
import { canonicalRim, canonicalRimScale } from "../game/hoop/hoopLayout";
import {
  rimStrips,
  rimSourceToCourt,
  rimContactMode,
} from "../game/hoop/rimGeometry";
import {
  createShot,
  assessShot,
  sampleShot,
} from "../domain/shooting/ShotTrajectory";
import { levels } from "../data/levels";
import {
  initialProgress,
  calculateStats,
} from "../domain/progression/progress";
import { contactGap, findMissContact } from "../game/physics/SafeHandoff";
import { HoopSensors } from "../game/hoop/HoopSensors";
const rim = { x: 200, y: 285 },
  stats = calculateStats(initialProgress());
describe("one physical/visual ball footprint", () => {
  it("uses the interpolated visible radius at sensor crossings, not a fixed old radius", () => {
    const sample = (scale: number) =>
      new HoopSensors(rim, 14).sample(
        { x: 215, y: 240, scale },
        { x: 215, y: 430, scale },
      );
    expect(sample(0.45).scored).toBe(false);
    expect(sample(0.42).scored).toBe(true);
  });
  it("inverts court perspective and ignores transparent PNG padding at every depth", () => {
    for (let i = 0; i <= 100; i++) {
      const scale = 1 - (i / 100) * 0.58;
      expect(
        ballContactRadius(scale) * PERSPECTIVE_CONFIG.hoopScale,
      ).toBeCloseTo(ballScreenRadius(scale), 10);
      expect(ballScreenRadius(scale) / ballDisplaySize(scale)).toBeCloseTo(
        ballProfile.solidRadius / ballProfile.sourceSize,
        10,
      );
    }
    expect(ballContactRadius(0.45)).toBeCloseTo(34.49164645, 7);
    expect(ballScreenRadius(0.45)).toBeCloseTo(25.17890191, 7);
  });
});
describe("canonical source-frame rim strips", () => {
  it("shares the visual anchor/scale and leaves an actual hole between both arcs", () => {
    const anchor = rimSourceToCourt(
      canonicalRim.frame.x + canonicalRim.frame.width * canonicalRim.originX,
      canonicalRim.frame.y + canonicalRim.frame.height * canonicalRim.originY,
      rim,
    );
    expect(anchor).toEqual(rim);
    const shapes = [...rimStrips("front", rim), ...rimStrips("back", rim)].map(
      (vertices) => ({
        vertices,
        label: "rim",
        bounds: { min: rim, max: rim },
      }),
    );
    expect(contactGap(rim, 0, shapes)).toBeGreaterThan(8);
    const rear = rimStrips("back", rim).flat();
    expect(Math.min(...rear.map((p) => p.y))).toBeCloseTo(
      rim.y + (399 - 576.9) * canonicalRimScale,
      8,
    );
    expect(
      rimStrips("front", rim)
        .flat()
        .some((p) => p.x === rim.x && p.y > rim.y),
    ).toBe(true);
    expect(rear.some((p) => p.x === rim.x && p.y < rim.y)).toBe(true);
  });
  it.each([
    [0, -125, "front"],
    [0, -165, "back"],
    [0, -140, "opening"],
    [0, -146, "opening"],
  ] as const)("selects occupied depth for %s/%s", (dx, dy, mode) => {
    const plan = createShot(dx, dy, levels[0], stats)!;
    expect(rimContactMode(plan, assessShot(plan, levels[0], stats))).toBe(mode);
  });
  it("sweeps the changing silhouette before a lateral front-arc overlap, without enabling foreground physics", () => {
    const p = createShot(38, -125, levels[0], stats)!;
    const shapes = rimStrips("front", rim).map((vertices) => ({
      vertices,
      label: "rim",
      bounds: { min: rim, max: rim },
    }));
    const radius = (t: number) => ballContactRadius(sampleShot(p, t).scale);
    expect(findMissContact(p, 0, 0.8, shapes, radius)).toBeNull();
    const hit = findMissContact(p, 0.8, 1, shapes, radius)!;
    expect(hit.progress).toBeGreaterThan(0.85);
    expect(hit.progress).toBeLessThan(0.9);
    expect(contactGap(hit.pose, radius(hit.progress), shapes)).toBeCloseTo(
      0.01,
      6,
    );
  });
});
