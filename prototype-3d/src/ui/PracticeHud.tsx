import { useState } from "react";
import { usePracticeStore as store } from "../store";
import { copySession, sessionLog } from "../debug/sessionLog";
import type { ShotResult } from "../domain/shot";
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
  return (
    <>
      <header className="brand">
        <span>AFTER HOURS</span>
        <small>UNLIMITED PRACTICE</small>
      </header>
      <div className="stats" aria-label="Practice score">
        <strong data-testid="makes">{s.makes}</strong>
        <span>
          MADE <i>/</i> <b data-testid="attempts">{s.attempts}</b> SHOTS
        </span>
      </div>
      <div className="court-controls">
        <button onClick={s.pause} aria-label="Pause practice">
          Ⅱ
        </button>
        <button onClick={s.restart} aria-label="Restart practice">
          ↻
        </button>
      </div>
      <div
        className={`feedback ${s.feedback && ["swish", "rim-make", "board-make"].includes(s.feedback) ? "made" : ""}`}
        role="status"
        aria-live="polite"
      >
        {s.feedback
          ? feedback[s.feedback]
          : s.phase === "aiming"
            ? "Up toward the hoop."
            : s.attempts === 0
              ? "Your next shot starts here."
              : ""}
      </div>
      <p className="shot-prompt">
        {s.phase === "flying"
          ? ""
          : s.phase === "aiming"
            ? "RELEASE TO SHOOT"
            : "SWIPE UP FROM THE BALL"}
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
