import { closestSurface, type Point } from "../../domain/geometry/polygon";
import {
  sampleShot,
  type ShotPlan,
  type ShotPose,
} from "../../domain/shooting/ShotTrajectory";
import {
  PERSPECTIVE_CONFIG,
  projectCourtPoint,
  projectShot,
  rimOnScreen,
} from "../../data/courtPerspective";
import { physics } from "../../data/physics";
import { shotFeel } from "../../data/shotFeel";
export interface ContactShape {
  vertices: readonly Point[];
  bounds: { min: Point; max: Point };
  label: string;
}
export const HANDOFF_SKIN = 0.01;
export function contactGap(
  point: Point,
  radius: number,
  shapes: readonly ContactShape[],
) {
  return Math.min(
    ...shapes.map((s) => closestSurface(point, s.vertices).distance - radius),
  );
}
export function contactBounds(shapes: readonly ContactShape[], radius: number) {
  return {
    minX: Math.min(...shapes.map((s) => s.bounds.min.x)) - radius,
    maxX: Math.max(...shapes.map((s) => s.bounds.max.x)) + radius,
    maxY: Math.max(...shapes.map((s) => s.bounds.max.y)) + radius,
  };
}
/** Same visible position/derivative in the fixed court space used by residual Matter. */
export function courtPose(plan: ShotPlan, t: number): ShotPose {
  const pose = sampleShot(plan, t),
    p = projectShot(pose, plan.rim),
    rim = rimOnScreen(plan.rim),
    s = PERSPECTIVE_CONFIG.hoopScale;
  const origin = projectCourtPoint(physics.origin, plan.rim),
    perTick = 1000 / 60 / plan.durationMs,
    derivative = -6 * t * (1 - t) * perTick;
  return {
    ...pose,
    t: 1,
    x: plan.rim.x + (p.x - rim.x) / s,
    y: plan.rim.y + (p.y - rim.y) / s,
    velocity: {
      x: pose.velocity.x + ((physics.origin.x - origin.x) * derivative) / s,
      y:
        pose.velocity.y +
        ((PERSPECTIVE_CONFIG.idleBallY - origin.y) * derivative) / s,
    },
  };
}
/** Only new contacts in the existing late approach window are eligible. Never rewind
 * a shape already occupied while foreground depth collisions were disabled. */
export function findMissContact(
  plan: ShotPlan,
  from: number,
  to: number,
  shapes: readonly ContactShape[],
  radius: number,
) {
  const start = Math.max(from, shotFeel.passMotion.approachSample);
  if (to <= start) return null;
  let previous = start;
  if (contactGap(courtPose(plan, start), radius, shapes) <= HANDOFF_SKIN)
    return null;
  for (let i = 1; i <= 16; i++) {
    const current = start + ((to - start) * i) / 16;
    if (contactGap(courtPose(plan, current), radius, shapes) <= HANDOFF_SKIN) {
      let safe = previous,
        blocked = current;
      for (let j = 0; j < 24; j++) {
        const mid = (safe + blocked) / 2;
        if (contactGap(courtPose(plan, mid), radius, shapes) > HANDOFF_SKIN)
          safe = mid;
        else blocked = mid;
      }
      return { progress: safe, pose: courtPose(plan, safe) };
    }
    previous = current;
  }
  return null;
}
/** Collision-disabled continuation uses Matter's gravity and normalized velocity
 * convention until an already occupied depth-ineligible shape is completely clear. */
export function advanceDeferred(pose: ShotPose, delta: number): ShotPose {
  const ticks = delta / (1000 / 60),
    vy = pose.velocity.y + physics.gravity * delta * (1000 / 60);
  return {
    ...pose,
    t: 1,
    x: pose.x + pose.velocity.x * ticks,
    y: pose.y + vy * ticks,
    rotation: pose.rotation + pose.angularVelocity * ticks,
    velocity: { x: pose.velocity.x, y: vy },
  };
}
