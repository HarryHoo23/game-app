import type { ShotContext } from "./spots";
import type { Vec3 } from "./types";
import type { GameConfig } from "../config";
export type Gesture = {
  start: { x: number; y: number };
  end: { x: number; y: number };
  width: number;
  height: number;
  durationMs: number;
};
export type Launch = {
  velocity: Vec3;
  angularVelocity: Vec3;
  normalized: { dx: number; up: number };
  intent: ShotIntent;
};
export type ShotIntent = {
  up: number;
  dx: number;
  aim: number;
  powerScale: number;
};
export function solveBallistic(
  origin: Vec3,
  target: Vec3,
  apex: number,
  gravity: number,
): Vec3 {
  if (
    ![...Object.values(origin), ...Object.values(target), apex, gravity].every(
      Number.isFinite,
    ) ||
    gravity <= 0 ||
    apex <= Math.max(origin.y, target.y)
  )
    throw new RangeError("Invalid ballistic geometry");
  const y = Math.sqrt(2 * gravity * (apex - origin.y));
  const t = y / gravity + Math.sqrt((2 * (apex - target.y)) / gravity);
  return { x: (target.x - origin.x) / t, y, z: (target.z - origin.z) / t };
}
/** Input interpretation is independent of the shooting spot and Rapier. */
export function readShotIntent(g: Gesture, c: GameConfig): ShotIntent | null {
  if (
    ![
      g.start.x,
      g.start.y,
      g.end.x,
      g.end.y,
      g.width,
      g.height,
      g.durationMs,
    ].every(Number.isFinite) ||
    g.width <= 0 ||
    g.height <= 0 ||
    g.durationMs <= 0
  )
    return null;
  const up = (g.start.y - g.end.y) / g.height;
  const dx = (g.end.x - g.start.x) / g.width;
  if (up < c.launch.minUp) return null;
  const p = c.launch,
    d = Math.min(1, up) - p.normalUp;
  const outer = Math.max(0, Math.abs(d) - p.softBand);
  const powerScale =
    p.model === "speed"
      ? Math.max(
          p.power.minScale,
          Math.min(
            p.power.maxScale,
            1 +
              p.power.softSlope * d +
              Math.sign(d) * p.power.outerGain * outer ** 2,
          ),
        )
      : 1;
  const aim =
    Math.sign(dx) *
    Math.min(
      p.maxAim,
      Math.max(0, Math.abs(dx) - p.aimDeadzone) ** p.aimExponent *
        p.aimSensitivity,
    );
  return { up, dx, aim, powerScale };
}

/** Only neutral power is solved to the hoop. Other powers scale that initial
 * velocity, so weak shots can lack height and strong shots can overshoot. */
export function launchFromIntent(
  intent: ShotIntent,
  c: GameConfig,
  context: ShotContext,
): Launch {
  const p = c.launch,
    { up, dx, aim, powerScale } = intent;
  const d = Math.min(1, up) - p.normalUp;
  const magnitude = Math.abs(d);
  // Retain historical target-offset models only for development A/B comparisons.
  const depth =
    p.model === "target"
      ? -Math.sign(d) *
        Math.min(
          p.maxDepth,
          (Math.min(magnitude, p.softBand) * p.softDepth) / p.softBand +
            Math.max(0, magnitude - p.softBand) * p.outerDepth,
        )
      : 0;
  const base = solveBallistic(
    context.origin,
    {
      x:
        c.hoop.center.x +
        context.basis.right.x * aim -
        context.basis.forward.x * depth,
      y: c.hoop.center.y,
      z:
        c.hoop.center.z +
        context.basis.right.z * aim -
        context.basis.forward.z * depth,
    },
    p.apex,
    c.gravity,
  );
  const velocity = {
    x: base.x * powerScale,
    y: base.y * powerScale,
    z: base.z * powerScale,
  };
  const horizontal = Math.hypot(velocity.x, velocity.z);
  return {
    velocity,
    // Preserve the legacy spin sign and magnitude; only orient to travel.
    angularVelocity: {
      x: velocity.z === 0 ? 0 : (-velocity.z / horizontal) * c.ball.backspin,
      y: 0,
      z: velocity.x === 0 ? 0 : (velocity.x / horizontal) * c.ball.backspin,
    },
    normalized: { dx, up },
    intent,
  };
}

export function mapGesture(
  g: Gesture,
  c: GameConfig,
  context: ShotContext = {
    origin: c.ball.origin,
    basis: { right: { x: 1, y: 0, z: 0 }, forward: { x: 0, y: 0, z: -1 } },
  },
): Launch | null {
  const intent = readShotIntent(g, c);
  return intent ? launchFromIntent(intent, c, context) : null;
}
