import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, Float32BufferAttribute, DoubleSide } from "three";
import { config as c } from "../config";
import { netPose, type ShotFeedback } from "../domain/shotFeedback";
import { hoopArt, useArtTexture } from "./art";
export function Net({ feedback }: { feedback: ShotFeedback }) {
  const texture = useArtTexture(hoopArt.net);
  const data = useMemo(() => {
    const positions: number[] = [],
      uv: number[] = [],
      indices: number[] = [],
      weights: number[] = [];
    const sides = 32,
      levels = 12,
      r = c.hoop.innerRadius + c.hoop.tubeRadius;
    for (let j = 0; j <= levels; j++)
      for (let i = 0; i <= sides; i++) {
        const t = j / levels,
          a = (i / sides) * Math.PI * 2,
          radius = r * (1 - 0.44 * t);
        positions.push(
          Math.cos(a) * radius,
          -t * c.feedback.netHeight,
          Math.sin(a) * radius,
        );
        uv.push(
          0.5 + Math.cos(a) * (0.45 - 0.18 * t),
          1 - (123 + t * 983) / 1254,
        );
        weights.push(t);
        if (j < levels && i < sides) {
          const k = j * (sides + 1) + i;
          indices.push(
            k,
            k + sides + 1,
            k + 1,
            k + 1,
            k + sides + 1,
            k + sides + 2,
          );
        }
      }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return { geometry, base: new Float32Array(positions), weights };
  }, []);
  useEffect(() => () => data.geometry.dispose(), [data]);
  useFrame(() => {
    const p = netPose(feedback.net, feedback.time, c),
      attr = data.geometry.attributes.position;
    for (let i = 0; i < attr.count; i++) {
      const t = data.weights[i],
        w = t * t;
      attr.setXYZ(
        i,
        data.base[i * 3] + p.x * w,
        data.base[i * 3 + 1] * (1 + p.stretch),
        data.base[i * 3 + 2] + p.z * w,
      );
    }
    attr.needsUpdate = true;
  });
  return (
    <mesh
      geometry={data.geometry}
      position={[c.hoop.center.x, c.hoop.center.y - 0.012, c.hoop.center.z]}
      frustumCulled={false}
    >
      <meshStandardMaterial
        map={texture}
        alphaTest={0.38}
        side={DoubleSide}
        roughness={1}
        emissiveMap={texture}
        emissive="#e9e0cf"
        emissiveIntensity={0.22}
      />
    </mesh>
  );
}
