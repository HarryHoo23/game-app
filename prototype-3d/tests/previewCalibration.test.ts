import { it, expect } from "vitest";
import { config } from "../src/config";
import { mapGesture } from "../src/domain/launch";
import { writePreviewPoints } from "../src/domain/shotVisuals";
it("a limited preview shows only early flight without changing launch velocity", () => {
  const velocity = mapGesture(
    {
      start: { x: 200, y: 620 },
      end: { x: 200, y: 406.4 },
      width: 400,
      height: 712,
      durationMs: 240,
    },
    config,
  )!.velocity;
  const full = new Float32Array(36),
    partial = new Float32Array(36);
  writePreviewPoints(velocity, config, full);
  writePreviewPoints(
    velocity,
    config,
    partial,
    undefined,
    config.ball.origin,
    0.55,
  );
  expect(partial[34]).toBeGreaterThan(3.85);
  expect(partial[34]).toBeLessThan(3.95);
  expect(full[34]).toBeLessThan(3);
});
