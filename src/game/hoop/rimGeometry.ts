import { shotFeel } from "../../data/shotFeel";
import { canonicalRim, canonicalRimScale } from "./hoopLayout";
import type { Point } from "../../domain/geometry/polygon";
import type {
  ShotPlan,
  ShotResult,
} from "../../domain/shooting/ShotTrajectory";

export type RimArc = "front" | "back";
export type RimContactMode = RimArc | "opening";
export const contactCategory = {
  environment: 1,
  front: 2,
  back: 4,
  boardTop: 8,
  boardLeft: 16,
  boardRight: 32,
} as const;
/** With the real ball footprint, visible late contacts begin before the old
 * point-sized 90% cutoff. Foreground ascent/apex remain collision-disabled.
 * This only opens the sweep window; a clear trajectory never hands off early.
 */
export const rimContactConfig = { lateApproachProgress: 0.8 } as const;
/** Tube outline sampled in the SAME source frame as both rim sprites. The
 * hanging mounting plate and net hooks are not part of the circular tube.
 * Consecutive outer/inner pairs form convex strips, never a solid ellipse hull.
 */
export const rimProfile = {
  back: [
    [31, 577, 85, 577],
    [131, 484, 169, 533],
    [290, 443, 310, 496],
    [446, 418, 454, 471],
    [627.5, 399, 627.5, 478],
    [804, 418, 796, 471],
    [960, 443, 940, 496],
    [1119, 484, 1081, 533],
    [1224, 577, 1170, 577],
  ],
  front: [
    [31, 577, 85, 577],
    [131, 665, 169, 626],
    [290, 715, 310, 670],
    [446, 724, 454, 677],
    [627.5, 724, 627.5, 677],
    [804, 724, 796, 677],
    [960, 715, 940, 670],
    [1119, 665, 1081, 626],
    [1224, 577, 1170, 577],
  ],
} as const;
export function rimSourceToCourt(x: number, y: number, rim: Point): Point {
  return {
    x:
      rim.x +
      (x -
        canonicalRim.frame.x -
        canonicalRim.frame.width * canonicalRim.originX) *
        canonicalRimScale,
    y:
      rim.y +
      (y -
        canonicalRim.frame.y -
        canonicalRim.frame.height * canonicalRim.originY) *
        canonicalRimScale,
  };
}
export function rimStrips(arc: RimArc, rim: Point): Point[][] {
  return rimProfile[arc].slice(1).map((p, i) => {
    const a = rimProfile[arc][i];
    return [
      [a[0], a[1]],
      [p[0], p[1]],
      [p[2], p[3]],
      [a[2], a[3]],
    ].map(([x, y]) => rimSourceToCourt(x, y, rim));
  });
}
/** A screen ellipse is not a solid 3D aperture. Existing deterministic arrival
 * depth decides which half is occupied. The accepted through-opening corridor
 * stays controlled; misses can touch only the arc at their arrival depth.
 * This is collision eligibility, not an impulse or an alternative scoring gate.
 */
export function rimContactMode(
  plan: ShotPlan,
  result: ShotResult,
): RimContactMode {
  if (result.made) return "opening";
  return plan.target.y >= plan.rim.y - shotFeel.hoopApproachOffset
    ? "front"
    : "back";
}
