import { usePracticeStore as store } from "../store";
export function PauseOverlay() {
  const paused = store((s) => s.phase === "paused"),
    challenge = store((s) => s.mode === "challenge");
  return paused ? (
    <div
      className="pause"
      role="dialog"
      aria-label={challenge ? "Challenge paused" : "Practice paused"}
    >
      <span>TAKE A BREATH</span>
      <h1>The court can wait.</h1>
      <button onClick={() => store.getState().resume()}>
        Continue shooting
      </button>
      <button className="quiet" onClick={() => store.getState().restart()}>
        Start fresh
      </button>
    </div>
  ) : null;
}
