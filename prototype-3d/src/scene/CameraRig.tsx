import { useState, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { config as c } from "../config";
import { activeSpot, orbitPose, spotSettings } from "../domain/spots";
import { usePracticeStore as store } from "../store";
export function CameraRig() {
  const [initial] = useState(() => activeSpot(store.getState()).camera);
  const motion = useRef({
    key: "",
    from: 0,
    elapsed: 0,
    duration: spotSettings.transitionSeconds as number,
    paused: false,
  });
  useEffect(
    () =>
      store.subscribe((s) => {
        if (s.phase === "paused") motion.current.paused = true;
      }),
    [],
  );
  useFrame(({ camera }, dt) => {
    const s = store.getState(),
      spot = activeSpot(s),
      m = motion.current;
    if (s.phase === "paused") {
      m.paused = true;
      return;
    }
    if (s.phase === "changingSpot") {
      const key = `${s.sessionId}-${spot.id}`;
      if (m.key !== key) {
        m.key = key;
        m.from =
          (Math.atan2(
            camera.position.z - c.hoop.center.z,
            -(camera.position.x - c.hoop.center.x),
          ) *
            180) /
          Math.PI;
        m.elapsed = 0;
        m.duration =
          Math.abs(m.from - spot.angle) > 100
            ? 0.8
            : spotSettings.transitionSeconds;
      }
      if (Math.abs(m.from - spot.angle) < 0.001) {
        m.elapsed = m.duration;
      } else m.elapsed += m.paused ? 0 : Math.min(dt, 0.1);
      const p = orbitPose(m.from, spot.angle, m.elapsed / m.duration, spot);
      camera.position.set(p.x, p.y, p.z);
      camera.lookAt(spot.target.x, spot.target.y, spot.target.z);
      camera.updateMatrixWorld();
      if (m.elapsed >= m.duration) {
        camera.position.set(spot.camera.x, spot.camera.y, spot.camera.z);
        camera.lookAt(spot.target.x, spot.target.y, spot.target.z);
        camera.updateMatrixWorld();
        store.getState().cameraSettled(s.sessionId, s.spotIndex);
      }
    }
    m.paused = false;
  });
  return (
    <PerspectiveCamera
      makeDefault
      position={[initial.x, initial.y, initial.z]}
      fov={c.camera.fov}
      near={0.05}
      far={40}
      onUpdate={(camera) => {
        const s = activeSpot(store.getState());
        camera.lookAt(s.target.x, s.target.y, s.target.z);
        camera.updateMatrixWorld();
      }}
    />
  );
}
