import { usePracticeStore as store } from "../store";
import { activeSpot } from "../domain/spots";
import { BallMesh } from "./Ball";
/** One decorative stand and one standby mesh; neither has a physics body. */
export function SpotRack() {
  const s = store(),
    spot = activeSpot(s),
    o = spot.origin,
    yaw = Math.atan2(-spot.basis.right.z, spot.basis.right.x);
  return (
    <group
      visible={s.mode === "challenge" && s.phase !== "completed"}
      position={[o.x, o.y, o.z]}
      rotation={[0, yaw, 0]}
    >
      <mesh position={[0.19, -0.16, 0.01]}>
        <boxGeometry args={[0.68, 0.025, 0.15]} />
        <meshStandardMaterial color="#33555a" metalness={0.6} roughness={0.6} />
      </mesh>
      {[-0.12, 0.5].map((x) => (
        <mesh key={x} position={[x, -0.75, 0.01]}>
          <boxGeometry args={[0.025, 1.15, 0.1]} />
          <meshStandardMaterial color="#213d43" roughness={0.8} />
        </mesh>
      ))}
      <group visible={s.ballInSpot === 0} position={[0.38, 0, -0.2]}>
        <BallMesh standby />
      </group>
    </group>
  );
}
