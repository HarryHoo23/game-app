import { shotFeel } from "../../data/shotFeel";
import { physics } from "../../data/physics";
import { getHoopGeometry } from "./hoopGeometry";
import { points } from "../levels/session";
import type { LevelConfig } from "../../data/levels";
import type { Stats } from "../progression/progress";
import type { Vec } from "../scoring/basketDetector";
export interface ShotPlan {
  start: Vec;
  target: Vec;
  power: number;
  arcHeight: number;
  durationMs: number;
  rotations: number;
  startScale: number;
  hoopScale: number;
}
export interface ShotPose extends Vec {
  t: number;
  scale: number;
  rotation: number;
  angularVelocity: number;
  velocity: Vec;
}
export type ShotImpact =
  "none" | "frontRim" | "backRim" | "backboard" | "airball";
export interface ShotResult {
  made: boolean;
  score: number;
  impact: ShotImpact;
  quality: "normal" | "swish" | "perfect" | "miss";
}
const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export function createShot(
  dx: number,
  dy: number,
  level: LevelConfig,
  stats: Stats,
): ShotPlan | null {
  const distance = Math.hypot(dx, dy);
  if (
    !Number.isFinite(distance) ||
    distance < shotFeel.minDrag ||
    dy > -shotFeel.minUpwardDrag
  )
    return null;
  const ideal = shotFeel.idealDrag / shotFeel.powerDrag;
  const raw = clamp(distance / shotFeel.powerDrag, 0, 1);
  const power = clamp(ideal + (raw - ideal) * (1 - stats.powerControl), 0, 1);
  return {
    start: { ...physics.origin },
    target: {
      x:
        physics.origin.x +
        clamp(dx / shotFeel.aimDrag, -1, 1) * shotFeel.aimRange,
      y: level.hoopY + (ideal - power) * shotFeel.powerDepthRange,
    },
    power,
    arcHeight:
      physics.height * lerp(shotFeel.arcMinRatio, shotFeel.arcMaxRatio, power),
    durationMs: clamp(
      shotFeel.durationMs + (ideal - power) * shotFeel.durationPowerInfluence,
      shotFeel.minDurationMs,
      shotFeel.maxDurationMs,
    ),
    rotations:
      shotFeel.baseRotations +
      (power - ideal) * shotFeel.rotationPowerInfluence,
    startScale: shotFeel.startScale,
    hoopScale: shotFeel.hoopScale,
  };
}
export function sampleShot(plan: ShotPlan, progress: number): ShotPose {
  const t = clamp(progress, 0, 1),
    smooth = t * t * (3 - 2 * t),
    perTick = 1000 / 60 / plan.durationMs;
  return {
    t,
    x: lerp(plan.start.x, plan.target.x, t),
    y: lerp(plan.start.y, plan.target.y, t) - plan.arcHeight * 4 * t * (1 - t),
    scale: lerp(plan.startScale, plan.hoopScale, smooth),
    rotation: -Math.PI * 2 * plan.rotations * t,
    angularVelocity: -Math.PI * 2 * plan.rotations * perTick,
    velocity: {
      x: (plan.target.x - plan.start.x) * perTick,
      y:
        (plan.target.y - plan.start.y - plan.arcHeight * 4 * (1 - 2 * t)) *
        perTick,
    },
  };
}
export function predictShot(plan: ShotPlan): ShotPose[] {
  return Array.from({ length: shotFeel.previewDots }, (_, i) =>
    sampleShot(
      plan,
      lerp(
        shotFeel.previewStart,
        shotFeel.previewEnd,
        i / (shotFeel.previewDots - 1),
      ),
    ),
  );
}
/** Only assess at hoop depth (t=1); earlier 2D rim-plane crossings are not baskets. */
export function assessShot(
  plan: ShotPlan,
  level: LevelConfig,
  stats: Stats,
): ShotResult {
  const end = sampleShot(plan, 1),
    dx = end.x - level.hoopX,
    dy = end.y - level.hoopY,
    geometry = getHoopGeometry(level);
  const projectedRadius = (physics.foregroundBallSize * plan.hoopScale) / 2;
  const horizontalClearance = geometry.clearHalfWidth - projectedRadius;
  const error =
    (dx / horizontalClearance) ** 2 + (dy / shotFeel.depthTolerance) ** 2;
  if (horizontalClearance > 0 && end.velocity.y > 0 && error <= 1) {
    const contact = Math.sqrt(error) >= shotFeel.contactThreshold;
    const perfect =
      !contact &&
      Math.abs(dx) <= stats.perfectTolerance &&
      Math.abs(dy) <= shotFeel.perfectDepthTolerance;
    return {
      made: true,
      score: points(contact, perfect),
      impact: contact ? (dy >= 0 ? "frontRim" : "backRim") : "none",
      quality: contact ? "normal" : perfect ? "perfect" : "swish",
    };
  }
  const near = Math.abs(dx) <= geometry.rimHalfWidth + projectedRadius;
  const impact: ShotImpact =
    near && dy < -shotFeel.backboardDepth
      ? "backboard"
      : near && Math.abs(dy) <= shotFeel.backboardDepth
        ? dy >= 0
          ? "frontRim"
          : "backRim"
        : "airball";
  return { made: false, score: 0, impact, quality: "miss" };
}
