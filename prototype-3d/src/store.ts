import { create } from "zustand";
import { isMake, type ShotResult } from "./domain/shot";
import { createPlayerProgress } from "./domain/playerProgress";
export type Mode = "practice" | "endless";
export type Phase =
  "ready" | "aiming" | "flying" | "recovering" | "paused" | "gameover";
type GameStore = {
  mode: Mode;
  missesLeft: number;
  best: number;
  tutorialVisible: boolean;
  sessionId: number;
  attempts: number;
  makes: number;
  phase: Phase;
  phaseBeforePause: Phase;
  feedback: ShotResult | null;
  currentShotId: number | null;
  resolved: boolean;
  recordReady: (sessionId: number) => void;
  recordLaunch: (sessionId: number, shotId: number) => boolean;
  recordResult: (
    sessionId: number,
    shotId: number,
    result: ShotResult,
  ) => boolean;
  setAiming: (active: boolean) => void;
  restart: () => void;
  startMode: (mode: Mode) => void;
  pause: () => void;
  resume: () => void;
};
export function createGameStore(
  progress = createPlayerProgress(),
  mode: Mode = "practice",
) {
  return create<GameStore>((set) => ({
    mode,
    missesLeft: 3,
    best: progress.readBest(),
    tutorialVisible: !progress.hasLearnedSwipe(),
    sessionId: 1,
    attempts: 0,
    makes: 0,
    phase: "ready",
    phaseBeforePause: "ready",
    feedback: null,
    currentShotId: null,
    resolved: false,
    recordReady: (id) =>
      set((s) =>
        id === s.sessionId && s.phase === "recovering"
          ? { phase: "ready" }
          : {},
      ),
    recordLaunch: (sessionId, shotId) => {
      let accepted = false;
      set((s) => {
        if (
          sessionId !== s.sessionId ||
          !Number.isSafeInteger(shotId) ||
          shotId <= (s.currentShotId ?? 0) ||
          (s.phase !== "ready" && s.phase !== "aiming")
        )
          return {};
        accepted = true;
        progress.learnSwipe();
        return {
          attempts: s.attempts + 1,
          currentShotId: shotId,
          resolved: false,
          phase: "flying",
          feedback: null,
          tutorialVisible: false,
        };
      });
      return accepted;
    },
    recordResult: (sessionId, shotId, result) => {
      let accepted = false;
      set((s) => {
        if (
          sessionId !== s.sessionId ||
          shotId !== s.currentShotId ||
          s.resolved ||
          s.phase !== "flying"
        )
          return {};
        accepted = true;
        const made = isMake(result),
          makes = s.makes + Number(made);
        const missesLeft = s.missesLeft - Number(s.mode === "endless" && !made);
        return {
          makes,
          missesLeft,
          best:
            s.mode === "endless" && made ? progress.recordBest(makes) : s.best,
          resolved: true,
          phase: missesLeft === 0 ? "gameover" : "recovering",
          feedback: result,
        };
      });
      return accepted;
    },
    setAiming: (active) =>
      set((s) =>
        s.phase === "ready" || s.phase === "aiming"
          ? { phase: active ? "aiming" : "ready" }
          : {},
      ),
    restart: () =>
      set((s) => ({
        sessionId: s.sessionId + 1,
        attempts: 0,
        makes: 0,
        missesLeft: 3,
        best: progress.readBest(),
        phase: "ready",
        phaseBeforePause: "ready",
        feedback: null,
        currentShotId: null,
        resolved: false,
      })),
    startMode: (mode) =>
      set((s) => ({
        mode,
        sessionId: s.sessionId + 1,
        attempts: 0,
        makes: 0,
        missesLeft: 3,
        best: progress.readBest(),
        phase: "ready",
        phaseBeforePause: "ready",
        feedback: null,
        currentShotId: null,
        resolved: false,
      })),
    pause: () =>
      set((s) =>
        s.phase !== "paused" && s.phase !== "gameover"
          ? {
              phaseBeforePause: s.phase === "aiming" ? "ready" : s.phase,
              phase: "paused",
            }
          : {},
      ),
    resume: () =>
      set((s) => (s.phase === "paused" ? { phase: s.phaseBeforePause } : {})),
  }));
}
// Keep the existing hook contract; only the default browser mode changes.
const initialMode: Mode =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("mode") !== "practice"
    ? "endless"
    : "practice";
export const usePracticeStore = createGameStore(
  createPlayerProgress(),
  initialMode,
);
