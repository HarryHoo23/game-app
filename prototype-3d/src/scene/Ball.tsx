import { useMemo, useCallback, useEffect, memo } from "react";
import { SphereGeometry } from "three";
import {
  RigidBody,
  BallCollider,
  type RapierRigidBody,
} from "@react-three/rapier";
import { config as c, BALL_GROUPS } from "../config";
import { hoopArt, useArtTexture } from "./art";
export function BallMesh() {
  const texture = useArtTexture(hoopArt.ball);
  const geometry = useMemo(() => {
    const g = new SphereGeometry(c.ball.radius, 48, 32),
      p = g.attributes.position,
      uv = g.attributes.uv;
    // The supplied art is a photographed sphere, not an equirectangular map.
    // Project onto both hemispheres while retaining a rotating 3D silhouette.
    for (let i = 0; i < p.count; i++)
      uv.setXY(
        i,
        0.5 + (0.463 * p.getX(i)) / c.ball.radius,
        0.497 + (0.46 * p.getY(i)) / c.ball.radius,
      );
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh castShadow geometry={geometry}>
      <meshStandardMaterial
        map={texture}
        roughness={0.88}
        emissiveMap={texture}
        emissive="#ffffff"
        emissiveIntensity={0.18}
      />
    </mesh>
  );
}
export const Ball = memo(function Ball({
  id,
  register,
}: {
  id: number;
  register: (id: number, body: RapierRigidBody | null) => void;
}) {
  const o = c.ball.origin;
  const ref = useCallback(
    (body: RapierRigidBody | null) => register(id, body),
    [id, register],
  );
  // Rapier's callback ref registers creation but does not call null on removal.
  useEffect(() => () => register(id, null), [id, register]);
  const position = useMemo<[number, number, number]>(
    () => [o.x, o.y, o.z],
    [o.x, o.y, o.z],
  );
  return (
    <RigidBody ref={ref} type="fixed" colliders={false} ccd position={position}>
      <BallCollider
        args={[c.ball.radius]}
        mass={c.ball.mass}
        restitution={c.ball.restitution}
        friction={c.ball.friction}
        collisionGroups={BALL_GROUPS}
      />
      <BallMesh />
    </RigidBody>
  );
});
