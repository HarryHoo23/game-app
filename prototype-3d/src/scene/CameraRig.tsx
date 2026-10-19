import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { config as c } from "../config";
export function CameraRig() {
  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={c.camera.position}
        fov={c.camera.fov}
        near={0.05}
        far={40}
      />
      <LookAt />
    </>
  );
}
function LookAt() {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.lookAt(...c.camera.target);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}
