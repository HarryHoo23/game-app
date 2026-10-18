import { physics } from "./physics";
import { shotFeel } from "./shotFeel";
import { PERSPECTIVE_CONFIG } from "./courtPerspective";

/** basketball.png: alpha >= 128, 96 radial samples about its unchanged image origin.
 * Transparent padding is not a contact surface. Recalibrate if the asset changes.
 */
export const ballProfile = {
  sourceSize: 1254,
  solidRadius: 593.2528971694956,
} as const;
export function ballDisplaySize(logicalScale: number) {
  const progress =
    (shotFeel.startScale - logicalScale) /
    (shotFeel.startScale - shotFeel.hoopScale);
  return (
    physics.foregroundBallSize *
    PERSPECTIVE_CONFIG.idleBallScale *
    (1 + progress * (PERSPECTIVE_CONFIG.ballScaleAtRim - 1))
  );
}
export function ballScreenRadius(logicalScale: number) {
  return (
    (ballDisplaySize(logicalScale) * ballProfile.solidRadius) /
    ballProfile.sourceSize
  );
}
/** Inverse of the fixed court projection, shared by Matter, sweeps and sensors. */
export function ballContactRadius(logicalScale: number) {
  return ballScreenRadius(logicalScale) / PERSPECTIVE_CONFIG.hoopScale;
}
