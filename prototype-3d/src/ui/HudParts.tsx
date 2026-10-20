import { useState } from "react";
import { usePracticeStore as store, type Mode } from "../store";
import { copySession, sessionLog } from "../debug/sessionLog";
import type { ShotAudio } from "../audio/shotAudio";
export function switchMode(mode: Mode) {
  const url = new URL(window.location.href);
  url.searchParams.set("mode", mode);
  window.history.replaceState(null, "", url);
  store.getState().startMode(mode);
}
export function HudBrand() {
  const mode = store((s) => s.mode);
  return (
    <header className="brand">
      <span>AFTER HOURS</span>
      <button
        className="mode-switch"
        onClick={() =>
          switchMode(mode === "practice" ? "challenge" : "practice")
        }
        aria-label={
          mode === "practice"
            ? "Play Five Spot Challenge"
            : "Switch to Unlimited Practice"
        }
      >
        <small>
          {mode === "practice" ? "UNLIMITED PRACTICE" : "FIVE SPOT CHALLENGE"}
        </small>
        <span>{mode === "practice" ? "Challenge" : "Practice"} ↗</span>
      </button>
    </header>
  );
}
export function HudControls({ audio }: { audio: ShotAudio }) {
  const [muted, setMuted] = useState(() => audio.snapshot().muted);
  const s = store(),
    name = s.mode === "practice" ? "practice" : "challenge";
  return (
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
      <button onClick={s.pause} aria-label={`Pause ${name}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 6v12M16 6v12" />
        </svg>
      </button>
      <button onClick={s.restart} aria-label={`Restart ${name}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.5 9A7 7 0 1 0 19 15M18.5 4.5V9H14" />
        </svg>
      </button>
    </div>
  );
}
export function SwipePrompt() {
  const s = store();
  return (
    <>
      {s.tutorialVisible && (
        <p className="swipe-tutorial" role="note">
          Start on the ball.
          <br />
          Swipe up and release.
        </p>
      )}
      <p className="shot-prompt">
        {(s.phase === "ready" || s.phase === "aiming") && (
          <>
            <svg viewBox="0 0 16 20" aria-hidden="true">
              <path d="M8 17V3M3 8l5-5 5 5" />
            </svg>
            {s.phase === "aiming" ? "RELEASE TO SHOOT" : "SWIPE UP TO SHOOT"}
          </>
        )}
      </p>
    </>
  );
}
export function SessionExport() {
  const [copied, setCopied] = useState("Copy session JSON"),
    mode = store((s) => s.mode);
  if (!import.meta.env.DEV) return null;
  return (
    <details className="debug">
      <summary>Session log</summary>
      <button
        onClick={async () => {
          const text = sessionLog?.exportSession() ?? "{}";
          const result = await copySession(
            text,
            (t) => navigator.clipboard.writeText(t),
            (t) => {
              const url = URL.createObjectURL(
                new Blob([t], { type: "application/json" }),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = `after-hours-${mode}.json`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            },
          );
          setCopied(result === "copied" ? "Copied" : "Downloaded");
        }}
      >
        {copied}
      </button>
    </details>
  );
}
