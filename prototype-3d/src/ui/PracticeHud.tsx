import { useState } from "react";
import { usePracticeStore as store, type Mode } from "../store";
import { copySession, sessionLog } from "../debug/sessionLog";
import type { ShotResult } from "../domain/shot";
import { isMake } from "../domain/shot";
import type { ShotAudio } from "../audio/shotAudio";
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
function download(text: string, mode: Mode) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `after-hours-${mode}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function PracticeHud({ audio }: { audio: ShotAudio }) {
  const [muted, setMuted] = useState(() => audio.snapshot().muted);
  const s = store(),
    [copied, setCopied] = useState("Copy session JSON");
  const made = s.feedback !== null && isMake(s.feedback);
  const endless = s.mode === "endless",
    over = s.phase === "gameover";
  const switchMode = (mode: Mode) => {
    const url = new URL(window.location.href);
    url.searchParams.set("mode", mode);
    window.history.replaceState(null, "", url);
    s.startMode(mode);
  };
  return (
    <>
      <header className="brand">
        <span>AFTER HOURS</span>
        <button
          className="mode-switch"
          onClick={() => switchMode(endless ? "practice" : "endless")}
          aria-label={
            endless ? "Switch to Unlimited Practice" : "Play Endless Hoops"
          }
        >
          <small>{endless ? "ENDLESS HOOPS" : "UNLIMITED PRACTICE"}</small>
          <span>{endless ? "Practice" : "Endless"} ↗</span>
        </button>
      </header>
      <div
        className="stats"
        aria-label={endless ? "Endless score" : "Practice score"}
      >
        <div className="stat-made">
          <strong key={s.makes} data-testid="makes">
            {s.makes}
          </strong>
          <span>{endless ? "SCORE" : "MADE"}</span>
        </div>
        <span className="stat-divider" />
        <div className="stat-attempts">
          <strong data-testid={endless ? "best" : "attempts"}>
            {endless ? s.best : s.attempts}
          </strong>
          <span>{endless ? "BEST" : "ATTEMPTS"}</span>
        </div>
        {endless && (
          <div
            className="stat-attempts chances"
            aria-label={`${s.missesLeft} miss chances remaining`}
          >
            <strong data-testid="chances">{s.missesLeft}</strong>
            <span>LEFT</span>
          </div>
        )}
      </div>
      <div className="court-controls">
        <button
          aria-label={muted ? "Unmute audio" : "Mute audio"}
          aria-pressed={muted}
          onClick={() => {
            const value = !muted;
            audio.setMuted(value);
            if (!value) audio.unlock();
            setMuted(value);
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4V5Z" />
            {muted ? (
              <path d="m16 9 5 6m0-6-5 6" />
            ) : (
              <path d="M16 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14" />
            )}
          </svg>
        </button>
        <button
          onClick={s.pause}
          aria-label={endless ? "Pause Endless run" : "Pause practice"}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 6v12M16 6v12" />
          </svg>
        </button>
        <button
          onClick={s.restart}
          aria-label={endless ? "Restart Endless run" : "Restart practice"}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18.5 9A7 7 0 1 0 19 15M18.5 4.5V9H14" />
          </svg>
        </button>
      </div>
      {!over && (
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
                    ? endless
                      ? "Three misses. How far can you go?"
                      : "Your next shot starts here."
                    : ""}
            </span>
          </div>
        </div>
      )}
      {s.tutorialVisible && !over && (
        <p className="swipe-tutorial" role="note">
          Start on the ball.
          <br />
          Swipe up and release.
        </p>
      )}
      {!over && (
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
      )}
      {over && (
        <section className="pause game-over" aria-label="Game Over">
          <span>ENDLESS HOOPS</span>
          <h1>Game Over</h1>
          <div className="run-totals">
            <div>
              <strong>{s.makes}</strong>
              <span>Score</span>
            </div>
            <div>
              <strong>{s.best}</strong>
              <span>Best Score</span>
            </div>
          </div>
          <button className="retry" onClick={s.restart} autoFocus>
            Retry
          </button>
          <button className="quiet" onClick={() => switchMode("practice")}>
            Unlimited Practice
          </button>
        </section>
      )}
      {import.meta.env.DEV && (
        <details className="debug">
          <summary>Session log</summary>
          <button
            onClick={async () => {
              const text = sessionLog?.exportSession() ?? "{}";
              const r = await copySession(
                text,
                (t) => navigator.clipboard.writeText(t),
                (text) => download(text, s.mode),
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
