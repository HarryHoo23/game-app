import { create } from "zustand";
import { isMake, type ShotResult } from "./domain/shot";
export type Phase = "ready" | "aiming" | "flying" | "recovering" | "paused";
type PracticeStore = {
  sessionId: number;
  attempts: number;
  makes: number;
  phase: Phase;
  phaseBeforePause: Phase;
  feedback: ShotResult | null;
  currentShotId: number | null;
  resolved: boolean;
  recordReady: (sessionId: number) => void;
  recordLaunch: (sessionId: number, shotId: number) => void;
  recordResult: (sessionId: number, shotId: number, result: ShotResult) => void;
  setAiming: (active: boolean) => void;
  restart: () => void;
  pause: () => void;
  resume: () => void;
};
export const usePracticeStore = create<PracticeStore>((set) => ({
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
      id === s.sessionId && s.phase !== "paused" ? { phase: "ready" } : {},
    ),
  recordLaunch: (sessionId, shotId) =>
    set((s) =>
      sessionId === s.sessionId && (s.phase === "ready" || s.phase === "aiming")
        ? {
            attempts: s.attempts + 1,
            currentShotId: shotId,
            resolved: false,
            phase: "flying",
            feedback: null,
          }
        : {},
    ),
  recordResult: (sessionId, shotId, result) =>
    set((s) =>
      sessionId === s.sessionId && shotId === s.currentShotId && !s.resolved
        ? {
            makes: s.makes + Number(isMake(result)),
            resolved: true,
            phase: "recovering",
            feedback: result,
          }
        : {},
    ),
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
      phase: "ready",
      phaseBeforePause: "ready",
      feedback: null,
      currentShotId: null,
      resolved: false,
    })),
  pause: () =>
    set((s) =>
      s.phase !== "paused"
        ? {
            phaseBeforePause: s.phase === "aiming" ? "ready" : s.phase,
            phase: "paused",
          }
        : {},
    ),
  resume: () =>
    set((s) => (s.phase === "paused" ? { phase: s.phaseBeforePause } : {})),
}));
