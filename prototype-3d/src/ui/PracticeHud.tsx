import { usePracticeStore as store } from "../store";
import type { ShotAudio } from "../audio/shotAudio";
import type { ShotResult } from "../domain/shot";
import { isMake } from "../domain/shot";
import { HudBrand, HudControls, SessionExport, SwipePrompt } from "./HudParts";
import { ChallengeHud } from "./ChallengeHud";
const messages: Record<ShotResult, string> = {
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
export function PracticeHud({ audio }: { audio: ShotAudio }) {
  const s = store();
  if (s.mode === "challenge") return <ChallengeHud audio={audio} />;
  const made = s.feedback !== null && isMake(s.feedback);
  return (
    <>
      <HudBrand />
      <HudControls audio={audio} />
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
              ? messages[s.feedback]
              : s.phase === "aiming"
                ? "Up toward the hoop."
                : s.attempts === 0
                  ? "Your next shot starts here."
                  : ""}
          </span>
        </div>
      </div>
      <SwipePrompt />
      <SessionExport />
    </>
  );
}
