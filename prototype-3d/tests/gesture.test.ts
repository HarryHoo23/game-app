import { beforeAll, it, expect } from "vitest";
import { config as c } from "../src/config";
import { mapGesture } from "../src/domain/launch";
import { initPhysics } from "./helpers/rapierWorld";
import { simulateShot } from "./helpers/simulateShot";
beforeAll(initPhysics);
const gesture = (
  up: number,
  dx = 0,
  width = 400,
  height = 712,
  durationMs = 240,
) => ({
  start: { x: width / 2, y: height * 0.88 },
  end: { x: width * (0.5 + dx), y: height * (0.88 - up) },
  width,
  height,
  durationMs,
});
it("mapping_is_viewport_and_duration_independent", () => {
  const a = mapGesture(gesture(0.3, 0.02), c)!;
  expect(mapGesture(gesture(0.3, 0.02, 320, 568), c)!.velocity.z).toBeCloseTo(
    a.velocity.z,
    9,
  );
  expect(mapGesture(gesture(0.3, 0.02, 400, 712, 600), c)!.velocity).toEqual(
    a.velocity,
  );
  expect(mapGesture(gesture(0.3, 0.02, 400, 712, 100), c)!.velocity).toEqual(
    a.velocity,
  );
});
it("natural_band_is_continuous_and_forgiving", () => {
  const a = mapGesture(gesture(0.22), c)!,
    b = mapGesture(gesture(0.3), c)!,
    d = mapGesture(gesture(0.38), c)!;
  expect(a.velocity.z).toBeGreaterThan(b.velocity.z);
  expect(d.velocity.z).toBeLessThan(b.velocity.z);
  expect(Math.abs(a.velocity.z - b.velocity.z)).toBeLessThan(0.1);
  expect(Math.abs(mapGesture(gesture(0.3, 0.01), c)!.velocity.x)).toBe(0);
  expect(
    Math.abs(mapGesture(gesture(0.3, 0.2), c)!.velocity.x),
  ).toBeGreaterThan(0.2);
  expect(
    simulateShot(c.hoop.center, mapGesture(gesture(0.07), c)!.velocity).result,
  ).toBe("short");
  const strong = simulateShot(
    c.hoop.center,
    mapGesture(gesture(0.7), c)!.velocity,
  );
  expect(strong.makes).toBe(0);
});
it("rejects taps, downward, empty dimensions and invalid data", () => {
  for (const g of [
    gesture(0),
    gesture(-0.1),
    gesture(0.3, 0, 0),
    gesture(0.3, NaN),
    gesture(0.3, 0, 400, 712, 0),
  ])
    expect(mapGesture(g, c)).toBeNull();
});
it("ordinary straight swipes remain physical makes inside the moderate band", () => {
  for (const up of [0.22, 0.25, 0.3, 0.35, 0.38]) {
    const s = simulateShot(c.hoop.center, mapGesture(gesture(up), c)!.velocity);
    expect(s.makes, `up=${up}`).toBe(1);
  }
});
