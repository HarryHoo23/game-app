import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide } from "three";
import { config as c } from "../config";
import { type ShotFeedback } from "../domain/shotFeedback";
import { hoopArt, useArtTexture } from "./art";
import { netGeometry } from "./artGeometry";
export function Net({ feedback }: { feedback: ShotFeedback }) {
  const texture = useArtTexture(hoopArt.net);
  const data = useMemo(() => netGeometry(c), []);
  useEffect(() => () => data.geometry.dispose(), [data]);
  useFrame(() => {
    const p = feedback.pose,
      attr = data.geometry.attributes.position;
    for (let i = 0; i < attr.count; i++) {
      const t = data.weights[i],
        w = t * t;
      attr.setXYZ(
        i,
        data.base[i * 3] *
          (1 +
            (p.bulge / c.hoop.innerRadius) *
              Math.exp(-Math.pow((t - p.depth) * 4, 2)) *
              w) +
          p.x * w,
        data.base[i * 3 + 1] - c.feedback.netHeight * p.stretch * w,
        data.base[i * 3 + 2] *
          (1 +
            (p.bulge / c.hoop.innerRadius) *
              Math.exp(-Math.pow((t - p.depth) * 4, 2)) *
              w) +
          p.z * w,
      );
    }
    attr.needsUpdate = true;
    data.geometry.computeVertexNormals();
  });
  return (
    <mesh
      geometry={data.geometry}
      position={[c.hoop.center.x, c.hoop.center.y - 0.012, c.hoop.center.z]}
      frustumCulled={false}
    >
      <meshStandardMaterial
        map={texture}
        alphaTest={0.3}
        alphaToCoverage
        side={DoubleSide}
        roughness={1}
        emissiveMap={texture}
        emissive="#e9e0cf"
        emissiveIntensity={0.08}
      />
    </mesh>
  );
}
