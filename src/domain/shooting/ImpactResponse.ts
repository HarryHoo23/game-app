import type { Vec } from "../scoring/basketDetector";
import type { ShotImpact } from "./ShotTrajectory";
import { impactFeel } from "../../data/impactFeel";
import { hoopLayout, type BallDepthState } from "../../game/hoop/hoopLayout";
/** The projected front/rear rim planes are real 2.5D contacts, not a sound-only classification. */
export function missVelocity(
  velocity: Vec,
  impact: ShotImpact,
  point: Vec,
  rim: Vec,
): Vec {
  if (impact !== "frontRim" && impact !== "backRim") return { ...velocity };
  const response = impact === "frontRim" ? impactFeel.front : impactFeel.back;
  const side = Math.sign(point.x - rim.x);
  return { x: side ? Math.abs(response.x) * side : response.x, y: response.y };
}
export function postShotDepth(
  point: Vec,
  rim: Vec,
  visualExitY = rim.y + hoopLayout.sensors.exit,
): BallDepthState {
  if (point.y >= visualExitY) return "BELOW_HOOP";
  if (Math.abs(point.x - rim.x) > hoopLayout.rimWidth) return "APPROACHING";
  if (point.y < rim.y - impactFeel.upperOcclusionClearance)
    return "APPROACHING";
  return point.y < rim.y ? "AT_RIM" : "IN_NET";
}
/** Contact-before-result gate; board approaches stay unresolved until contact or spatial clearance. */
export class MissContact {
  private elapsed = 0;
  resolved = false;
  constructor(
    readonly expected: ShotImpact,
    private rim: Vec,
    private bounds?: { minX: number; maxX: number; maxY: number },
    private physicalOnly = false,
  ) {}
  advance(
    delta: number,
    position: Vec,
  ): { resolve: boolean; contact: ShotImpact | null } {
    if (this.resolved) return { resolve: false, contact: null };
    this.elapsed += delta;
    const lead =
      this.expected === "backRim"
        ? impactFeel.backContactLead
        : impactFeel.frontContactLead;
    if (
      !this.physicalOnly &&
      (this.expected === "frontRim" || this.expected === "backRim") &&
      position.y >= this.rim.y - lead
    ) {
      this.resolved = true;
      return { resolve: true, contact: this.expected };
    }
    const rimCandidate =
      this.expected === "frontRim" || this.expected === "backRim";
    const cleared = this.bounds
      ? position.x < this.bounds.minX ||
        position.x > this.bounds.maxX ||
        position.y > this.bounds.maxY
      : Math.abs(position.x - this.rim.x) > impactFeel.contactZoneHalfWidth ||
        position.y > this.rim.y + impactFeel.contactZoneBottom;
    if (
      (!rimCandidate && cleared) ||
      this.elapsed >=
        (rimCandidate
          ? impactFeel.rimContactMaxWaitMs
          : impactFeel.maxMissObservationMs)
    ) {
      this.resolved = true;
      return { resolve: true, contact: null };
    }
    return { resolve: false, contact: null };
  }
  collide(kind: "rim" | "backboard"): ShotImpact | null {
    if (this.resolved) return null;
    this.resolved = true;
    return kind === "backboard"
      ? "backboard"
      : this.expected === "backRim"
        ? "backRim"
        : "frontRim";
  }
}
