import { useMemo, useCallback, useEffect, memo } from "react";
import { MeshStandardMaterial } from "three";
import { ballSurface } from "./artGeometry";
import {
  RigidBody,
  BallCollider,
  type RapierRigidBody,
} from "@react-three/rapier";
import { config as c, BALL_GROUPS } from "../config";
import { hoopArt, useArtTexture } from "./art";
export function BallMesh() {
  const texture = useArtTexture(hoopArt.ball);
  const geometry = useMemo(() => ballSurface(c), []);
  const material = useMemo(() => {
    const m = new MeshStandardMaterial({ map: texture, roughness: 0.74 });
    m.customProgramCacheKey = () => "after-hours-leather-v1";
    m.onBeforeCompile = (shader) => {
      shader.vertexShader =
        "varying vec3 vBallSurface;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvBallSurface = normalize(position);",
      );
      shader.fragmentShader =
        "varying vec3 vBallSurface;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `
        vec3 n = normalize(vBallSurface);
        vec3 blend = pow(abs(n),vec3(4.0)); blend /= blend.x+blend.y+blend.z;
        vec3 leather = texture2D(map,n.yz*0.8).rgb*blend.x
          + texture2D(map,n.xz*0.8).rgb*blend.y + texture2D(map,n.xy*0.8).rgb*blend.z;
        float curved = min(abs(n.z-0.56*(1.0-n.y*n.y)),abs(n.z+0.56*(1.0-n.y*n.y)));
        float d = min(min(abs(n.x),abs(n.y)),curved);
        float aa = max(fwidth(d),0.002);
        float seam = 1.0-smoothstep(0.015-aa,0.020+aa,d);
        diffuseColor.rgb *= mix(leather,vec3(0.025,0.012,0.006),seam);
      `,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <normal_fragment_maps>",
        `
        #include <normal_fragment_maps>
        float leatherHeight=dot(leather,vec3(0.2126,0.7152,0.0722))*(1.0-seam);
        vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition);
        vec3 r1=cross(sy,normal),r2=cross(normal,sx);
        float determinant=dot(sx,r1);
        normal=normalize(abs(determinant)*normal-0.0007*sign(determinant)*(dFdx(leatherHeight)*r1+dFdy(leatherHeight)*r2));
      `,
      );
    };
    return m;
  }, [texture]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  return <mesh castShadow geometry={geometry} material={material} />;
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
