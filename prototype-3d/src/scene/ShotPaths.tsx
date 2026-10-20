import { practiceSpot, type ShotContext } from "../domain/spots";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import { InstancedMesh, Object3D } from "three";
import { config as c, BALL_GROUPS } from "../config";
import { launchFromIntent } from "../domain/launch";
import {
  writePreviewPoints,
  writeTrailPoints,
  type TrailBuffer,
  type ShotVisualDiagnostics,
} from "../domain/shotVisuals";
import type { ShotBridge } from "../input/useShotInput";
import { usePracticeStore as store } from "../store";

export function ShotPaths({
  bridge,
  flights,
  clock,
}: {
  bridge: RefObject<ShotBridge>;
  flights: RefObject<
    ReadonlyMap<number, { trail: TrailBuffer; launchedAt: number }>
  >;
  clock: { time: number };
}) {
  const preview = useRef<InstancedMesh>(null),
    trail = useRef<InstancedMesh>(null);
  const { world, rapier } = useRapier();
  const data = useMemo(
    () => ({
      dots: new Float32Array(c.shotVisuals.preview.points * 3),
      positions: new Float32Array(
        c.shotVisuals.trail.points * c.recovery.maxBodies * 3,
      ),
      weights: new Float32Array(
        c.shotVisuals.trail.points * c.recovery.maxBodies,
      ),
      transform: new Object3D(),
      shape: new rapier.Ball(c.ball.radius),
      context: null as ShotContext | null,
      baseline: launchFromIntent(
        { up: c.launch.normalUp, dx: 0, aim: 0, powerScale: 1 },
        c,
        practiceSpot,
      ).velocity,
      previousVelocity: null as object | null,
      diagnostics: {
        previewCount: 0,
        previewHit: false,
        previewVelocity: null,
        trailCount: 0,
      } as ShotVisualDiagnostics,
    }),
    [rapier],
  );
  useEffect(() => {
    bridge.current.visuals = data.diagnostics;
    return () => {
      if (bridge.current.visuals === data.diagnostics)
        bridge.current.visuals = null;
    };
  }, [bridge, data]);
  useFrame(() => {
    if (!preview.current || !trail.current) return;
    const state = store.getState(),
      paused = state.phase === "paused",
      challenge = state.mode === "challenge";
    const context = bridge.current.context ?? practiceSpot;
    if (data.context !== context) {
      data.context = context;
      data.baseline = launchFromIntent(
        { up: c.launch.normalUp, dx: 0, aim: 0, powerScale: 1 },
        c,
        context,
      ).velocity;
      data.previousVelocity = null;
    }
    const velocity =
      !paused && bridge.current.ready
        ? (bridge.current.preview?.velocity ??
          (challenge ? null : data.baseline))
        : null;
    if (velocity !== data.previousVelocity) {
      data.previousVelocity = velocity;
      const result = velocity
        ? writePreviewPoints(
            velocity,
            c,
            challenge ? data.dots.subarray(0, 12 * 3) : data.dots,
            (from, to) =>
              world.castShape(
                from,
                { x: 0, y: 0, z: 0, w: 1 },
                { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z },
                data.shape,
                0,
                1,
                true,
                undefined,
                BALL_GROUPS,
              )?.time_of_impact ?? null,
            context.origin,
            challenge ? 0.55 : undefined,
          )
        : { count: 0, hit: false };
      data.diagnostics.previewCount = preview.current.count = result.count;
      data.diagnostics.previewEnd = result.count
        ? {
            x: data.dots[(result.count - 1) * 3],
            y: data.dots[(result.count - 1) * 3 + 1],
            z: data.dots[(result.count - 1) * 3 + 2],
          }
        : null;
      data.diagnostics.previewHit = result.hit;
      data.diagnostics.previewVelocity = velocity ? { ...velocity } : null;
      for (let i = 0; i < result.count; i++) {
        data.transform.position.fromArray(data.dots, i * 3);
        const p = c.shotVisuals.preview;
        data.transform.scale.setScalar(
          p.nearRadius +
            ((p.farRadius - p.nearRadius) * i) / Math.max(1, result.count - 1),
        );
        data.transform.updateMatrix();
        preview.current.setMatrixAt(i, data.transform.matrix);
      }
      preview.current.instanceMatrix.needsUpdate = true;
    }
    const material = preview.current.material;
    if (!Array.isArray(material))
      material.opacity = bridge.current.preview
        ? challenge
          ? 0.34
          : c.shotVisuals.preview.aimOpacity
        : c.shotVisuals.preview.idleOpacity;
    let count = 0;
    if (!paused)
      for (const flight of flights.current.values()) {
        count += writeTrailPoints(
          flight.trail,
          clock.time - flight.launchedAt,
          c.shotVisuals.trail.duration,
          data.positions,
          data.weights,
          count,
        );
      }
    data.diagnostics.trailCount = trail.current.count = count;
    for (let i = 0; i < count; i++) {
      data.transform.position.fromArray(data.positions, i * 3);
      data.transform.scale.setScalar(
        c.shotVisuals.trail.radius * data.weights[i],
      );
      data.transform.updateMatrix();
      trail.current.setMatrixAt(i, data.transform.matrix);
    }
    trail.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh
        ref={preview}
        count={0}
        args={[undefined, undefined, c.shotVisuals.preview.points]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial
          color="#a9f3d3"
          transparent
          opacity={c.shotVisuals.preview.idleOpacity}
          depthWrite={false}
        />
      </instancedMesh>
      <instancedMesh
        ref={trail}
        count={0}
        args={[
          undefined,
          undefined,
          c.shotVisuals.trail.points * c.recovery.maxBodies,
        ]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial
          color="#a9f3d3"
          transparent
          opacity={c.shotVisuals.trail.opacity}
          depthWrite={false}
        />
      </instancedMesh>
    </>
  );
}
