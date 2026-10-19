import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { config as c, COURT_GROUPS } from "../config";
export function Court() {
  return (
    <>
      <color attach="background" args={["#071820"]} />
      <fog attach="fog" args={["#071820", 10, 25]} />
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
          <meshStandardMaterial color="#112d36" roughness={0.92} />
        </mesh>
      </RigidBody>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0.7]}>
        <planeGeometry args={[2.7, 3.2]} />
        <meshStandardMaterial color="#183e47" roughness={0.9} />
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
