import { useMemo } from "react";
import {
  RigidBody,
  CapsuleCollider,
  CuboidCollider,
} from "@react-three/rapier";
import { Quaternion, Euler } from "three";
import { config as c, COURT_GROUPS } from "../config";
import { createRimSegments } from "./geometry";
import { rimGeometry } from "./artGeometry";
import { useEffect } from "react";
import { hoopArt, useArtTexture } from "./art";
import { Net } from "./Net";
import type { ShotFeedback } from "../domain/shotFeedback";
export function Hoop({ feedback }: { feedback: ShotFeedback }) {
  const segments = useMemo(() => createRimSegments(c), []);
  const board = useArtTexture(hoopArt.board),
    paint = useArtTexture(hoopArt.rim);
  const geometry = useMemo(() => rimGeometry(c), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const h = c.hoop,
    b = c.board;
  return (
    <>
      <RigidBody
        type="fixed"
        colliders={false}
        name="rim"
        userData={{ kind: "rim" }}
      >
        {segments.map((s, i) => (
          <CapsuleCollider
            key={i}
            args={[s.halfLength, h.tubeRadius]}
            position={[s.center.x, s.center.y, s.center.z]}
            rotation={new Euler().setFromQuaternion(
              new Quaternion(
                s.rotation.x,
                s.rotation.y,
                s.rotation.z,
                s.rotation.w,
              ),
            )}
            collisionGroups={COURT_GROUPS}
            restitution={h.restitution}
            name="rim"
          />
        ))}
        <mesh
          geometry={geometry}
          position={[h.center.x, h.center.y, h.center.z]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <meshStandardMaterial map={paint} metalness={0.35} roughness={0.42} />
        </mesh>
      </RigidBody>
      <RigidBody
        type="fixed"
        colliders={false}
        name="board"
        userData={{ kind: "board" }}
      >
        <CuboidCollider
          args={[b.size.x / 2, b.size.y / 2, b.size.z / 2]}
          position={[b.center.x, b.center.y, b.center.z]}
          collisionGroups={COURT_GROUPS}
          restitution={b.restitution}
          name="board"
        />
        <mesh position={[b.center.x, b.center.y, b.center.z]}>
          <boxGeometry args={[b.size.x, b.size.y, b.size.z]} />
          <meshStandardMaterial
            color="#29383b"
            roughness={0.6}
            metalness={0.4}
          />
        </mesh>
        <mesh
          position={[b.center.x, b.center.y, b.center.z + b.size.z / 2 + 0.001]}
        >
          <planeGeometry args={[b.size.x, b.size.y]} />
          <meshStandardMaterial
            map={board}
            transparent
            alphaTest={0.1}
            roughness={0.65}
            metalness={0.18}
            emissiveMap={board}
            emissive="#ffffff"
            emissiveIntensity={0.16}
          />
        </mesh>
      </RigidBody>
      <mesh position={[0, h.center.y - 0.045, -0.335]} castShadow>
        <boxGeometry args={[0.12, 0.075, 0.15]} />
        <meshStandardMaterial map={paint} metalness={0.35} roughness={0.5} />
      </mesh>
      <Net feedback={feedback} />
    </>
  );
}
