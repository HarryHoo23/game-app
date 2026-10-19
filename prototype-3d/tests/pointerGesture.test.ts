import { it, expect } from "vitest";
import { config } from "../src/config";
import { createPointerGesture } from "../src/input/pointerGesture";
const start = {
  pointerId: 1,
  x: 200,
  y: 630,
  time: 100,
  width: 400,
  height: 712,
  primary: true,
};
it("identical endpoints do not depend on move count", () => {
  const outputs = [];
  for (const steps of [0, 5, 50]) {
    const p = createPointerGesture(config);
    p.begin(start);
    for (let i = 0; i < steps; i++) p.move(1, 200, 630 - i);
    outputs.push(p.end(1, 200, 420, 340));
  }
  expect(outputs[1]).toEqual(outputs[0]);
  expect(outputs[2]).toEqual(outputs[0]);
});
it("move previews the same raw gesture without consuming the release", () => {
  const p = createPointerGesture(config);
  p.begin(start);
  expect(p.move(2, 220, 420, 300)).toBeNull();
  expect(p.move(1, 220, 420, 300)).toEqual(p.end(1, 220, 420, 300));
  p.begin(start);
  p.cancel();
  expect(p.move(1, 220, 420, 300)).toBeNull();
});
it("cancel_resize_multitouch_does_not_launch", () => {
  const p = createPointerGesture(config);
  p.begin(start);
  expect(p.begin({ ...start, pointerId: 2, primary: false })).toBe(false);
  expect(p.end(2, 200, 400, 300)).toBeNull();
  expect(p.end(1, 200, 400, 300)).not.toBeNull();
  p.begin(start);
  p.cancel();
  expect(p.end(1, 200, 400, 300)).toBeNull();
  expect(p.begin({ ...start, primary: false })).toBe(false);
});
