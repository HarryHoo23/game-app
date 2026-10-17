import { physics } from "./physics";

/** Pure invertible court projection shared by planning and presentation. */
export const PERSPECTIVE_CONFIG = {
  hoopScale: 0.73,
  hoopYOffset: -physics.height * 0.04,
  idleBallScale: 0.88,
  idleBallCrop: 0.2,
  get idleBallY() {
    return (
      physics.height -
      physics.foregroundBallSize *
        this.idleBallScale *
        (0.5 - this.idleBallCrop)
    );
  },
  ballScaleAtRim: 0.42,
  tint: {
    backboard: 0xb9cccf,
    rimBack: 0xb5bfca,
    net: 0xa4bbb9,
    rimFront: 0xb5bfca,
  },
} as const;
export type RimPoint = { x: number; y: number };
export function rimOnScreen(rim: RimPoint) {
  return { x: rim.x, y: rim.y + PERSPECTIVE_CONFIG.hoopYOffset };
}
export function projectCourtPoint(point: RimPoint, rim: RimPoint) {
  const screen = rimOnScreen(rim),
    s = PERSPECTIVE_CONFIG.hoopScale;
  return {
    x: screen.x + (point.x - rim.x) * s,
    y: screen.y + (point.y - rim.y) * s,
  };
}
/** Blend the foreground origin into the distant court transform, keeping rim passage exact. */
export function projectShot(pose: RimPoint & { t: number }, rim: RimPoint) {
  const p = projectCourtPoint(pose, rim),
    origin = projectCourtPoint(physics.origin, rim),
    t = Math.max(0, Math.min(1, pose.t)),
    near = 1 - t * t * (3 - 2 * t);
  return {
    x: p.x + (physics.origin.x - origin.x) * near,
    y: p.y + (PERSPECTIVE_CONFIG.idleBallY - origin.y) * near,
  };
}
/** Inverse of projectShot at a known flight progress. */
export function unprojectShot(point: RimPoint, t: number, rim: RimPoint) {
  const offset = projectShot({ x: 0, y: 0, t }, rim);
  return {
    x: (point.x - offset.x) / PERSPECTIVE_CONFIG.hoopScale,
    y: (point.y - offset.y) / PERSPECTIVE_CONFIG.hoopScale,
  };
}
