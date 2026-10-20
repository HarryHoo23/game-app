import type { ShotAudio } from "../audio/shotAudio";
import { usePracticeStore as store } from "../store";
import { shootingSpots, TOTAL_SHOTS } from "../domain/spots";
import { isMake, type ShotResult } from "../domain/shot";
import {
  HudBrand,
  HudControls,
  SessionExport,
  SwipePrompt,
  switchMode,
} from "./HudParts";
const feedback: Record<ShotResult, string> = {
  swish: "SWISH",
  "rim-make": "OFF THE RIM",
  "board-make": "OFF THE GLASS",
  short: "SHORT",
  long: "LONG",
  left: "LEFT",
  right: "RIGHT",
  "rim-miss": "OFF THE RIM",
  "board-miss": "OFF THE GLASS",
  miss: "GO AGAIN",
};
export function ShotMarkers({ results = false }: { results?: boolean }) {
  const s = store(),
    current = s.phase === "flying" ? s.attempts - 1 : s.attempts;
  return (
    <div
      className={`spot-progress ${results ? "results-progress" : ""}`}
      aria-label="Ten shot results"
    >
      {shootingSpots.map((spot, index) => (
        <div className="spot-pair" key={spot.id} aria-label={spot.name}>
          <div>
            {[0, 1].map((ball) => {
              const i = index * 2 + ball,
                outcome = s.outcomes[i],
                state = outcome
                  ? isMake(outcome)
                    ? "made"
                    : "missed"
                  : i === current && !results
                    ? "current"
                    : "waiting";
              return (
                <span
                  key={i}
                  className={`shot-marker ${state}`}
                  data-testid={`shot-marker-${i}`}
                  data-state={state}
                  aria-label={`${spot.name}, ball ${ball + 1}: ${state}`}
                >
                  {state === "made"
                    ? "✓"
                    : state === "missed"
                      ? "×"
                      : state === "current"
                        ? "•"
                        : ""}
                </span>
              );
            })}
          </div>
          <small>{spot.shortName}</small>
        </div>
      ))}
    </div>
  );
}
export function ChallengeHud({ audio }: { audio: ShotAudio }) {
  const s = store(),
    spot = shootingSpots[s.spotIndex],
    completed = s.phase === "completed",
    moving = s.phase === "changingSpot";
  const shownShot =
    s.phase === "flying" || s.phase === "resolving" || completed
      ? s.attempts
      : Math.min(TOTAL_SHOTS, s.attempts + 1);
  return (
    <>
      <HudBrand />
      <HudControls audio={audio} />
      <div className="challenge-score" aria-label="Challenge score">
        <span>SCORE</span>
        <strong data-testid="makes">
          {s.makes}
          <small> / 10</small>
        </strong>
      </div>
      <div className="shot-counter">
        SHOT <strong data-testid="attempts">{shownShot}</strong> / 10
      </div>
      <ShotMarkers />
      {!completed && (
        <>
          <div className="spot-caption">
            <span>{String(s.spotIndex + 1).padStart(2, "0")} / 05</span>
            <strong>{spot.name}</strong>
            <small>BALL {s.ballInSpot + 1} OF 2</small>
          </div>
          {s.feedback && !moving && (
            <div
              className={`feedback challenge-feedback ${isMake(s.feedback) ? "made" : ""}`}
              role="status"
              aria-live="polite"
            >
              <div
                key={`${s.sessionId}-${s.attempts}`}
                className="feedback-content"
              >
                <strong>{feedback[s.feedback]}</strong>
              </div>
            </div>
          )}
          {moving && (
            <div className="spot-transition" role="status">
              <span>NEXT SPOT</span>
              <strong>{spot.name}</strong>
            </div>
          )}
          <SwipePrompt />
        </>
      )}
      {completed && (
        <section
          className="pause challenge-results"
          aria-label="Round complete"
        >
          <span>AFTER HOURS</span>
          <h1>
            {s.makes}
            <small> / 10</small>
          </h1>
          <strong className="best-label">
            {s.newBest ? "NEW BEST" : "ROUND COMPLETE"}
          </strong>
          <p>
            PERSONAL BEST <b data-testid="best">{s.best} / 10</b>
          </p>
          <ShotMarkers results />
          <button className="retry" onClick={s.restart} autoFocus>
            PLAY AGAIN
          </button>
          <button className="quiet" onClick={() => switchMode("practice")}>
            Unlimited Practice
          </button>
        </section>
      )}
      <SessionExport />
    </>
  );
}
