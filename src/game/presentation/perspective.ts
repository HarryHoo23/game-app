import { physics } from "../../data/physics";
import { shotFeel } from "../../data/shotFeel";
import { PERSPECTIVE_CONFIG } from "../../data/courtPerspective";
export {
  PERSPECTIVE_CONFIG,
  rimOnScreen,
  projectCourtPoint,
  projectShot,
  type RimPoint,
} from "../../data/courtPerspective";

export function ballDisplaySize(logicalScale: number) {
  const progress =
    (shotFeel.startScale - logicalScale) /
    (shotFeel.startScale - shotFeel.hoopScale);
  const relative = 1 + progress * (PERSPECTIVE_CONFIG.ballScaleAtRim - 1);
  return (
    physics.foregroundBallSize * PERSPECTIVE_CONFIG.idleBallScale * relative
  );
}
