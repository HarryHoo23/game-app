import { create } from "zustand";
import { isMake, type ShotResult } from "./domain/shot";
import { createPlayerProgress } from "./domain/playerProgress";
import {
  advanceRound,
  createRound,
  type RoundState,
  type Phase,
} from "./domain/round";
export type { Phase } from "./domain/round";
export type Mode = "practice" | "challenge";
type GameStore = RoundState & {
  mode: Mode;
  best: number;
  newBest: boolean;
  tutorialVisible: boolean;
  recordReady: (id: number) => void;
  cameraSettled: (id: number, spotIndex: number) => void;
  settle: (id: number) => void;
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
    ...createRound(1),
    mode,
    phase: mode === "practice" ? "ready" : "changingSpot",
    best: progress.readBest(),
    newBest: false,
    tutorialVisible: !progress.hasLearnedSwipe(),
    recordReady: (id) =>
      set((s) =>
        id === s.sessionId && s.mode === "practice" && s.phase === "recovering"
          ? { phase: "ready" }
          : {},
      ),
    cameraSettled: (id, spotIndex) =>
      set((s) =>
        s.mode === "practice"
          ? id === s.sessionId && s.phase === "changingSpot"
            ? { phase: "ready" }
            : {}
          : advanceRound(s, { type: "cameraReady", sessionId: id, spotIndex }),
      ),
    settle: (id) =>
      set((s) =>
        s.mode === "challenge"
          ? advanceRound(s, { type: "settle", sessionId: id })
          : {},
      ),
    recordLaunch: (sessionId, shotId) => {
      let accepted = false;
      set((s) => {
        if (
          sessionId !== s.sessionId ||
          (s.phase !== "ready" && s.phase !== "aiming") ||
          !Number.isSafeInteger(shotId) ||
          shotId <= (s.currentShotId ?? 0)
        )
          return {};
        const next =
          s.mode === "challenge"
            ? advanceRound(s, { type: "launch", sessionId, shotId })
            : {
                ...s,
                attempts: s.attempts + 1,
                currentShotId: shotId,
                resolved: false,
                phase: "flying" as Phase,
                feedback: null,
              };
        if (next === s) return {};
        accepted = true;
        progress.learnSwipe();
        return { ...next, tutorialVisible: false };
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
        if (s.mode === "practice")
          return {
            makes: s.makes + Number(isMake(result)),
            resolved: true,
            phase: "recovering",
            feedback: result,
          };
        const next = advanceRound(s, {
          type: "result",
          sessionId,
          shotId,
          result,
        });
        return next.phase === "completed"
          ? {
              ...next,
              newBest: next.makes > progress.readBest(),
              best: progress.recordBest(next.makes),
            }
          : next;
      });
      return accepted;
    },
    setAiming: (active) => set((s) => advanceRound(s, { type: "aim", active })),
    restart: () =>
      set((s) => ({
        ...createRound(s.sessionId + 1),
        phase:
          s.mode === "practice" &&
          s.phase !== "changingSpot" &&
          s.phaseBeforePause !== "changingSpot"
            ? "ready"
            : "changingSpot",
        mode: s.mode,
        best: progress.readBest(),
        newBest: false,
      })),
    startMode: (mode) =>
      set((s) => ({
        ...createRound(s.sessionId + 1),
        mode,
        best: progress.readBest(),
        newBest: false,
      })),
    pause: () => set((s) => advanceRound(s, { type: "pause" })),
    resume: () => set((s) => advanceRound(s, { type: "resume" })),
  }));
}
const initialMode: Mode =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("mode") !== "practice"
    ? "challenge"
    : "practice";
export const usePracticeStore = createGameStore(
  createPlayerProgress(),
  initialMode,
);
