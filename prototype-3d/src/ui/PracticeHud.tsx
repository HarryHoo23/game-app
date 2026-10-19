import { useState } from "react";
import { usePracticeStore as store } from "../store";
import { copySession, sessionLog } from "../debug/sessionLog";
import type { ShotResult } from "../domain/shot";
import { isMake } from "../domain/shot";
const feedback: Record<ShotResult, string> = {
  swish: "Nothing but net.",
  "rim-make": "Off the rim. In.",
  "board-make": "Off the glass. In.",
  short: "A little short. Swipe farther.",
  long: "A little long. Ease up.",
  left: "Left of the hoop.",
  right: "Right of the hoop.",
  "rim-miss": "Off the rim. Go again.",
  "board-miss": "Off the glass. Go again.",
  miss: "Go again.",
};
function download(text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "after-hours-practice.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function PracticeHud() {
  const s = store(),
    [copied, setCopied] = useState("Copy session JSON");
  const made = s.feedback !== null && isMake(s.feedback);
  return (
    <>
      <header className="brand">
        <span>AFTER HOURS</span>
        <small>UNLIMITED PRACTICE</small>
      </header>
      <div className="stats" aria-label="Practice score">
        <div className="stat-made">
          <strong key={s.makes} data-testid="makes">
            {s.makes}
          </strong>
          <span>MADE</span>
        </div>
        <span className="stat-divider" />
        <div className="stat-attempts">
          <strong data-testid="attempts">{s.attempts}</strong>
          <span>ATTEMPTS</span>
        </div>
      </div>
      <div className="court-controls">
        <button onClick={s.pause} aria-label="Pause practice">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 6v12M16 6v12" />
          </svg>
        </button>
        <button onClick={s.restart} aria-label="Restart practice">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18.5 9A7 7 0 1 0 19 15M18.5 4.5V9H14" />
          </svg>
        </button>
      </div>
      <div
        className={`feedback ${made ? "made" : ""} ${s.feedback === "swish" ? "swish" : ""}`}
        role="status"
        aria-live="polite"
      >
        <div
          key={`${s.sessionId}-${s.currentShotId}-${s.feedback}`}
          className="feedback-content"
        >
          {made && (
            <>
              <span className="reward-point">+1</span>
              <strong className="reward-title">
                {s.feedback === "swish"
                  ? "SWISH"
                  : s.feedback === "board-make"
                    ? "OFF THE GLASS"
                    : "BUCKET"}
              </strong>
            </>
          )}
          <span className="feedback-detail">
            {s.feedback
              ? feedback[s.feedback]
              : s.phase === "aiming"
                ? "Up toward the hoop."
                : s.attempts === 0
                  ? "Your next shot starts here."
                  : ""}
          </span>
        </div>
      </div>
      <p className="shot-prompt">
        {s.phase !== "flying" && (
          <svg viewBox="0 0 16 20" aria-hidden="true">
            <path d="M8 17V3M3 8l5-5 5 5" />
          </svg>
        )}
        {s.phase === "flying"
          ? ""
          : s.phase === "aiming"
            ? "RELEASE TO SHOOT"
            : "SWIPE UP TO SHOOT"}
      </p>
      {import.meta.env.DEV && (
        <details className="debug">
          <summary>Session log</summary>
          <button
            onClick={async () => {
              const text = sessionLog?.exportSession() ?? "{}";
              const r = await copySession(
                text,
                (t) => navigator.clipboard.writeText(t),
                download,
              );
              setCopied(r === "copied" ? "Copied" : "Downloaded");
            }}
          >
            {copied}
          </button>
        </details>
      )}
    </>
  );
}
