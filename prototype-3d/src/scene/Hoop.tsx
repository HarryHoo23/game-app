import { useMemo, useEffect } from "react";
import {
  RigidBody,
  CapsuleCollider,
  CuboidCollider,
} from "@react-three/rapier";
import {
  Quaternion,
  Euler,
  BufferGeometry,
  Float32BufferAttribute,
} from "three";
import { config as c, COURT_GROUPS } from "../config";
import { createRimSegments } from "./geometry";
export function Hoop() {
  const segments = useMemo(() => createRimSegments(c), []);
  const net = useMemo(() => {
    const p: number[] = [];
    for (let ring = 0; ring < 4; ring++)
      for (let i = 0; i < 16; i++) {
        const point = (r: number, n: number) => {
          const angle = ((n + (r % 2) * 0.5) / 16) * Math.PI * 2;
          const radius = 0.245 - r * 0.025;
          return [
            Math.cos(angle) * radius,
            -r * 0.13,
            Math.sin(angle) * radius,
          ];
        };
        p.push(...point(ring, i), ...point(ring, i + 1));
        if (ring < 3) {
          p.push(...point(ring, i), ...point(ring + 1, i));
          p.push(
            ...point(ring, i),
            ...point(ring + 1, i + (ring % 2 ? 1 : -1)),
          );
        }
      }
    return new BufferGeometry().setAttribute(
      "position",
      new Float32BufferAttribute(p, 3),
    );
  }, []);
  useEffect(() => () => net.dispose(), [net]);
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
          position={[h.center.x, h.center.y, h.center.z]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <torusGeometry
            args={[h.innerRadius + h.tubeRadius, h.tubeRadius, 10, 64]}
          />
          <meshStandardMaterial
            color="#ed8a42"
            metalness={0.25}
            roughness={0.45}
          />
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
            color="#adc3c7"
            roughness={0.7}
            transparent
            opacity={0.48}
          />
        </mesh>
      </RigidBody>
      {/* Painted target, on the front surface of the backboard. */}
      {[
        [0, 3.68, 0.6, 0.018],
        [0, 3.25, 0.6, 0.018],
        [-0.3, 3.465, 0.018, 0.43],
        [0.3, 3.465, 0.018, 0.43],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, b.center.z + b.size.z / 2 + 0.002]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial color="#e0e6d8" />
        </mesh>
      ))}
      <lineSegments geometry={net} position={[0, h.center.y - 0.02, 0]}>
        <lineBasicMaterial color="#e4e2cb" transparent opacity={0.8} />
      </lineSegments>
    </>
  );
}
