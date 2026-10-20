import { useMemo, useEffect } from "react";
import {
  BufferGeometry,
  Float32BufferAttribute,
  MeshStandardMaterial,
} from "three";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { config as c, COURT_GROUPS } from "../config";
export function Court() {
  const floor = useMemo(() => {
    const m = new MeshStandardMaterial({ color: "#1a3038", roughness: 0.96 });
    m.customProgramCacheKey = () => "night-asphalt-v1";
    m.onBeforeCompile = (s) => {
      s.vertexShader = "varying vec3 vCourt;\n" + s.vertexShader;
      s.vertexShader = s.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvCourt = position;",
      );
      s.fragmentShader = "varying vec3 vCourt;\n" + s.fragmentShader;
      s.fragmentShader = s.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float grit=fract(sin(dot(floor(vCourt.xz*140.0),vec2(12.9898,78.233)))*43758.5453);
        diffuseColor.rgb *= 0.91+grit*0.16;
      `,
      );
    };
    return m;
  }, []);
  const fence = useMemo(() => {
    const p: number[] = [];
    for (let i = -5; i <= 5; i++) p.push(i, 0, -2.7, i, 4.5, -2.7);
    for (const y of [0.3, 1.5, 3, 4.5]) p.push(-5, y, -2.7, 5, y, -2.7);
    return new BufferGeometry().setAttribute(
      "position",
      new Float32BufferAttribute(p, 3),
    );
  }, []);
  useEffect(
    () => () => {
      floor.dispose();
      fence.dispose();
    },
    [floor, fence],
  );
  return (
    <>
      <color attach="background" args={["#071820"]} />
      <fog attach="fog" args={["#071820", 8, 23]} />
      <ambientLight intensity={0.8} color="#8bb9bc" />
      <directionalLight
        position={[3, 7, 4]}
        color="#ffce91"
        intensity={2.6}
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={7}
        shadow-camera-bottom={-5}
      />
      <hemisphereLight args={["#72aeb4", "#10232e", 1]} />
      <spotLight
        position={[0, 6, 1]}
        angle={0.62}
        penumbra={1}
        intensity={26}
        distance={12}
        color="#e7c694"
      />
      <lineSegments geometry={fence}>
        <lineBasicMaterial color="#406269" transparent opacity={0.055} />
      </lineSegments>
      {/* Decorative only: offset behind the board, clear of the shooting corridor. */}
      <mesh position={[1.4, 1.6, -0.62]}>
        <boxGeometry args={[0.075, 3.2, 0.075]} />
        <meshStandardMaterial color="#30484b" metalness={0.4} roughness={0.7} />
      </mesh>
      <mesh position={[1.025, 3.2, -0.62]}>
        <boxGeometry args={[0.75, 0.075, 0.075]} />
        <meshStandardMaterial color="#30484b" metalness={0.4} roughness={0.7} />
      </mesh>
      <RigidBody
        type="fixed"
        colliders={false}
        name="floor"
        userData={{ kind: "floor" }}
      >
        <CuboidCollider
          args={[c.court.width / 2, 0.05, c.court.length / 2]}
          position={[0, -0.05, c.court.centerZ]}
          collisionGroups={COURT_GROUPS}
          restitution={c.court.floorRestitution}
          name="floor"
        />
        <mesh position={[0, -0.05, c.court.centerZ]} receiveShadow>
          <boxGeometry args={[c.court.width, 0.1, c.court.length]} />
          <primitive object={floor} attach="material" />
        </mesh>
      </RigidBody>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.003, 0.7]}
        receiveShadow
      >
        <planeGeometry args={[2.7, 3.2]} />
        <meshStandardMaterial color="#163943" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.009, 2.3]}>
        <ringGeometry args={[1.18, 1.195, 64, 1, 0, Math.PI]} />
        <meshBasicMaterial color="#486d70" />
      </mesh>
      {[-1.35, 1.35].map((x) => (
        <mesh
          key={x}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, 0.006, 0.7]}
        >
          <planeGeometry args={[0.025, 3.2]} />
          <meshBasicMaterial color="#779d9a" />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.007, 2.3]}>
        <planeGeometry args={[2.7, 0.025]} />
        <meshBasicMaterial color="#779d9a" />
      </mesh>
    </>
  );
}
