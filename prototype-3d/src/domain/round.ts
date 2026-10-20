import { TOTAL_SHOTS, spotSettings } from "./spots";
import { isMake, type ShotResult } from "./shot";
export type Phase =
  | "ready"
  | "aiming"
  | "flying"
  | "resolving"
  | "recovering"
  | "changingSpot"
  | "completed"
  | "paused";
export type RoundState = {
  sessionId: number;
  spotIndex: number;
  ballInSpot: number;
  attempts: number;
  makes: number;
  outcomes: (ShotResult | null)[];
  phase: Phase;
  phaseBeforePause: Phase;
  feedback: ShotResult | null;
  currentShotId: number | null;
  resolved: boolean;
  finalScore: number | null;
};
export type RoundAction =
  | { type: "launch"; sessionId: number; shotId: number }
  | { type: "result"; sessionId: number; shotId: number; result: ShotResult }
  | { type: "settle"; sessionId: number }
  | { type: "cameraReady"; sessionId: number; spotIndex: number }
  | { type: "aim"; active: boolean }
  | { type: "pause" }
  | { type: "resume" };
export function createRound(sessionId: number): RoundState {
  return {
    sessionId,
    spotIndex: 0,
    ballInSpot: 0,
    attempts: 0,
    makes: 0,
    outcomes: Array(TOTAL_SHOTS).fill(null),
    phase: "changingSpot",
    phaseBeforePause: "ready",
    feedback: null,
    currentShotId: null,
    resolved: false,
    finalScore: null,
  };
}
/** Pure ten-ball controller. Rapier and render time do not live here. */
export function advanceRound(s: RoundState, a: RoundAction): RoundState {
  if ("sessionId" in a && a.sessionId !== s.sessionId) return s;
  switch (a.type) {
    case "launch":
      if (
        (s.phase !== "ready" && s.phase !== "aiming") ||
        s.attempts >= TOTAL_SHOTS ||
        !Number.isSafeInteger(a.shotId) ||
        a.shotId <= (s.currentShotId ?? 0)
      )
        return s;
      return {
        ...s,
        attempts: s.attempts + 1,
        currentShotId: a.shotId,
        resolved: false,
        phase: "flying",
        feedback: null,
      };
    case "result": {
      if (s.phase !== "flying" || s.resolved || a.shotId !== s.currentShotId)
        return s;
      const outcomes = [...s.outcomes];
      outcomes[s.attempts - 1] = a.result;
      const makes = s.makes + Number(isMake(a.result)),
        complete = s.attempts === TOTAL_SHOTS;
      return {
        ...s,
        outcomes,
        makes,
        resolved: true,
        feedback: a.result,
        phase: complete ? "completed" : "resolving",
        finalScore: complete ? makes : null,
      };
    }
    case "settle":
      if (s.phase !== "resolving") return s;
      return s.ballInSpot + 1 < spotSettings.ballsPerSpot
        ? { ...s, ballInSpot: s.ballInSpot + 1, phase: "ready" }
        : {
            ...s,
            spotIndex: s.spotIndex + 1,
            ballInSpot: 0,
            phase: "changingSpot",
            feedback: null,
          };
    case "cameraReady":
      return s.phase === "changingSpot" && a.spotIndex === s.spotIndex
        ? { ...s, phase: "ready" }
        : s;
    case "aim":
      return s.phase === "ready" || s.phase === "aiming"
        ? { ...s, phase: a.active ? "aiming" : "ready" }
        : s;
    case "pause":
      return s.phase === "paused" || s.phase === "completed"
        ? s
        : {
            ...s,
            phaseBeforePause: s.phase === "aiming" ? "ready" : s.phase,
            phase: "paused",
          };
    case "resume":
      return s.phase === "paused" ? { ...s, phase: s.phaseBeforePause } : s;
  }
}
