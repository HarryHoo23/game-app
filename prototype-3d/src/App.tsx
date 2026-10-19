import {
  Component,
  Suspense,
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { config } from "./config";
import { CameraRig } from "./scene/CameraRig";
import { Court } from "./scene/Court";
import { Hoop } from "./scene/Hoop";
import { PracticeScene } from "./scene/PracticeScene";
import { useShotInput, type ShotBridge } from "./input/useShotInput";
import { usePracticeStore as store } from "./store";
import { PracticeHud } from "./ui/PracticeHud";
import { PauseOverlay } from "./ui/PauseOverlay";
import { createShotAudio } from "./audio/shotAudio";
import { createShotFeedback } from "./domain/shotFeedback";
export class GameBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div role="alert" className="error">
        <p>The court could not load. Please try again.</p>
        <button onClick={() => window.location.reload()}>Reload court</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export function App() {
  const [audio] = useState(createShotAudio);
  const [feedback] = useState(() => createShotFeedback(audio));
  const el = useRef<HTMLElement>(null),
    bridge = useRef<ShotBridge>({ ready: false, screen: null, launch: null });
  const [loaded, setLoaded] = useState(false),
    [hidden, setHidden] = useState(document.hidden);
  const onReady = useCallback(() => setLoaded(true), []);
  const sessionId = store((s) => s.sessionId),
    phase = store((s) => s.phase);
  useShotInput(
    el,
    bridge,
    sessionId,
    phase === "paused" || phase === "gameover",
    audio,
  );
  useEffect(() => {
    audio.setPaused(phase === "paused");
  }, [audio, phase]);
  useEffect(() => () => audio.dispose(), [audio]);
  useEffect(() => {
    const visibility = () => {
      setHidden(document.hidden);
      if (document.hidden) {
        bridge.current.ready = false;
        store.getState().pause();
      }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  return (
    <main className="game" ref={el} data-phase={phase}>
      <GameBoundary>
        <Canvas
          shadows
          frameloop={hidden ? "never" : "always"}
          dpr={[1, config.camera.dpr]}
          fallback={
            <p role="alert">This browser needs WebGL to open the court.</p>
          }
        >
          <CameraRig />
          <Suspense fallback={null}>
            <Physics
              gravity={[0, -config.gravity, 0]}
              timeStep={config.timeStep}
              paused={phase === "paused"}
            >
              <Court />
              <Hoop feedback={feedback} />
              <PracticeScene
                key={sessionId}
                sessionId={sessionId}
                bridge={bridge}
                onReady={onReady}
                audio={audio}
                feedback={feedback}
              />
            </Physics>
          </Suspense>
        </Canvas>
      </GameBoundary>
      <PracticeHud audio={audio} />
      {!loaded && <p className="loading">Opening the court…</p>}
      <PauseOverlay />
    </main>
  );
}
