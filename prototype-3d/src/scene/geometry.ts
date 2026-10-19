import type { GameConfig } from "../config";
import type { Vec3 } from "../domain/types";
export interface RimSegment {
  a: Vec3;
  b: Vec3;
  center: Vec3;
  halfLength: number;
  rotation: { x: number; y: number; z: number; w: number };
}
export function createRimSegments(c: GameConfig): RimSegment[] {
  const { center, innerRadius, tubeRadius, segments } = c.hoop;
  const radius = innerRadius + tubeRadius;
  const points = Array.from({ length: segments }, (_, i) => ({
    x: center.x + Math.cos((i / segments) * Math.PI * 2) * radius,
    y: center.y,
    z: center.z + Math.sin((i / segments) * Math.PI * 2) * radius,
  }));
  return points.map((a, i) => {
    const b = points[(i + 1) % segments];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    return {
      a,
      b,
      center: { x: (a.x + b.x) / 2, y: a.y, z: (a.z + b.z) / 2 },
      halfLength: length / 2,
      rotation: {
        x: ((b.z - a.z) / length) * Math.SQRT1_2,
        y: 0,
        z: (-(b.x - a.x) / length) * Math.SQRT1_2,
        w: Math.SQRT1_2,
      },
    };
  });
}
