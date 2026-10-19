import { describe, it, expect } from "vitest";
import { config } from "../src/config";
import { createRimSegments } from "../src/scene/geometry";
describe("one hollow rim geometry", () => {
  it("shares 32 connected capsule endpoints without blocking the opening", () => {
    const s = createRimSegments(config);
    expect(s).toHaveLength(32);
    expect(config.ball.radius).toBe(0.12);
    expect(config.hoop.innerRadius).toBe(0.232);
    expect(config.hoop.tubeRadius).toBe(0.017);
    for (let i = 0; i < s.length; i++) {
      expect(s[i].b).toEqual(s[(i + 1) % s.length].a);
      expect(Math.hypot(s[i].a.x, s[i].a.z)).toBeCloseTo(0.249, 6);
      expect(s[i].halfLength).toBeGreaterThan(0);
    }
  });
});
