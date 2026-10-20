import type { GameConfig } from "../config";
import type { Vec3, Sample } from "./types";
export type ShotVisualDiagnostics = {
  previewCount: number;
  previewHit: boolean;
  previewVelocity: Vec3 | null;
  trailCount: number;
};
export type PreviewCast = (from: Vec3, to: Vec3) => number | null;
/** Free-flight centre prediction; a sphere sweep truncates it at the first solid. */
export function writePreviewPoints(
  velocity: Vec3,
  c: GameConfig,
  out: Float32Array,
  cast?: PreviewCast,
  origin: Vec3 = c.ball.origin,
): { count: number; hit: boolean } {
  const p = c.shotVisuals.preview;
  const count = Math.min(p.points, Math.floor(out.length / 3));
  const targetY = c.hoop.center.y - p.endBelowRim;
  const end =
    (velocity.y +
      Math.sqrt(
        Math.max(0, velocity.y ** 2 + 2 * c.gravity * (origin.y - targetY)),
      )) /
    c.gravity;
  let prev = origin;
  for (let i = 0; i < count; i++) {
    const t = p.startTime + ((end - p.startTime) * i) / Math.max(1, count - 1);
    const next = {
      x: origin.x + velocity.x * t,
      y: origin.y + velocity.y * t - (c.gravity * t * t) / 2,
      z: origin.z + velocity.z * t,
    };
    const hit = cast?.(prev, next) ?? null;
    const a = hit === null ? 1 : Math.max(0, Math.min(1, hit));
    out[i * 3] = prev.x + (next.x - prev.x) * a;
    out[i * 3 + 1] = prev.y + (next.y - prev.y) * a;
    out[i * 3 + 2] = prev.z + (next.z - prev.z) * a;
    if (hit !== null) return { count: i + 1, hit: true };
    prev = next;
  }
  return { count, hit: false };
}
export type TrailBuffer = {
  positions: Float32Array;
  times: Float64Array;
  count: number;
  head: number;
  lastTime: number;
};
export function createTrailBuffer(capacity: number): TrailBuffer {
  return {
    positions: new Float32Array(capacity * 3),
    times: new Float64Array(capacity),
    count: 0,
    head: 0,
    lastTime: -Infinity,
  };
}
export function appendTrailSample(b: TrailBuffer, s: Sample, interval: number) {
  if (s.time - b.lastTime < interval - 1e-7) return;
  b.positions[b.head * 3] = s.position.x;
  b.positions[b.head * 3 + 1] = s.position.y;
  b.positions[b.head * 3 + 2] = s.position.z;
  b.times[b.head] = s.time;
  b.head = (b.head + 1) % b.times.length;
  b.count = Math.min(b.count + 1, b.times.length);
  b.lastTime = s.time;
}
export function writeTrailPoints(
  b: TrailBuffer,
  now: number,
  duration: number,
  positions: Float32Array,
  weights: Float32Array,
  offset = 0,
): number {
  let count = 0;
  for (let i = 0; i < b.count && offset + count < weights.length; i++) {
    const index = (b.head - b.count + i + b.times.length) % b.times.length,
      age = now - b.times[index];
    if (age < 0 || age >= duration) continue;
    const dest = (offset + count) * 3;
    positions[dest] = b.positions[index * 3];
    positions[dest + 1] = b.positions[index * 3 + 1];
    positions[dest + 2] = b.positions[index * 3 + 2];
    weights[offset + count] = 1 - age / duration;
    count++;
  }
  return count;
}
