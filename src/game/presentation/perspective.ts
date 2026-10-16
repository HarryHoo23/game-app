import { physics } from "../../data/physics";
import { shotFeel } from "../../data/shotFeel";
import type { ShotPose } from "../../domain/shooting/ShotTrajectory";

/** Render-only perspective. Simulation, sensors and launch coordinates stay unchanged. */
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
export function projectShot(
  pose: Pick<ShotPose, "x" | "y" | "t">,
  rim: RimPoint,
) {
  const p = projectCourtPoint(pose, rim),
    origin = projectCourtPoint(physics.origin, rim),
    t = Math.max(0, Math.min(1, pose.t)),
    near = 1 - t * t * (3 - 2 * t);
  return {
    x: p.x + (physics.origin.x - origin.x) * near,
    y: p.y + (PERSPECTIVE_CONFIG.idleBallY - origin.y) * near,
  };
}
export function ballDisplaySize(logicalScale: number) {
  const progress =
    (shotFeel.startScale - logicalScale) /
    (shotFeel.startScale - shotFeel.hoopScale);
  const relative = 1 + progress * (PERSPECTIVE_CONFIG.ballScaleAtRim - 1);
  return (
    physics.foregroundBallSize * PERSPECTIVE_CONFIG.idleBallScale * relative
  );
}
