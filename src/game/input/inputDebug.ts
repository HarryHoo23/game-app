import {
  assessShot,
  type ShotImpact,
  type ShotPlan,
  type ShotResult,
} from "../../domain/shooting/ShotTrajectory";
import { shotFeel } from "../../data/shotFeel";
import type { LevelConfig } from "../../data/levels";
import type { Stats } from "../../domain/progression/progress";
import type { GesturePoint } from "./shotGesture";

interface InputDebugShot {
  rawStartX: number;
  rawStartY: number;
  rawEndX: number;
  rawEndY: number;
  rawDx: number;
  rawDy: number;
  verticalDrag: number;
  mappedPower: number;
  /** Signed normalized aim response, -1..1. */
  mappedAim: number;
  targetX: number;
  targetY: number;
  arrivalHorizontalError: number;
  arrivalDepthError: number;
  predictedImpact: ShotImpact;
  finalImpact: ShotImpact | null;
  finalScore: number | null;
  finalQuality: ShotResult["quality"] | null;
}

const shots: InputDebugShot[] = [];
const records = new WeakMap<ShotPlan, InputDebugShot>();
const enabled = () =>
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("debugInput");

export function recordInputRelease(
  start: GesturePoint,
  end: GesturePoint,
  plan: ShotPlan,
  level: LevelConfig,
  stats: Stats,
) {
  if (!enabled()) return;
  const predicted = assessShot(plan, level, stats);
  const record: InputDebugShot = {
    rawStartX: start.x,
    rawStartY: start.y,
    rawEndX: end.x,
    rawEndY: end.y,
    rawDx: end.x - start.x,
    rawDy: end.y - start.y,
    verticalDrag: Math.max(0, start.y - end.y),
    mappedPower: plan.power,
    mappedAim: (plan.target.x - plan.start.x) / shotFeel.aimRange,
    targetX: plan.target.x,
    targetY: plan.target.y,
    arrivalHorizontalError: plan.target.x - level.hoopX,
    arrivalDepthError:
      plan.target.y - (level.hoopY - shotFeel.hoopApproachOffset),
    predictedImpact: predicted.impact,
    finalImpact: null,
    finalScore: null,
    finalQuality: null,
  };
  records.set(plan, record);
  shots.push(record);
  if (shots.length > 25) shots.shift();
  (window as Window & { __inputDebug?: unknown }).__inputDebug = {
    shots,
    clear: () => {
      shots.length = 0;
    },
  };
  console.table(shots);
}

/** Call on actual collision, including post-arrival Matter contacts. */
export function finishInputImpact(plan: ShotPlan, impact: ShotImpact) {
  if (!enabled()) return;
  const record = records.get(plan);
  if (record) record.finalImpact = impact;
}

/** Call once the ordered scoring sensors (or miss resolver) determine the outcome. */
export function finalizeInputShot(plan: ShotPlan, result: ShotResult) {
  if (!enabled()) return;
  const record = records.get(plan);
  if (!record) return;
  record.finalImpact ??= result.impact;
  record.finalScore = result.score;
  record.finalQuality = result.quality;
  console.table(shots);
}
