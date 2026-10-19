import {
  useLayoutEffect,
  useEffect,
  useRef,
  useState,
  useCallback,
  type RefObject,
} from "react";
import { useThree } from "@react-three/fiber";
import {
  useAfterPhysicsStep,
  useRapier,
  type RapierRigidBody,
} from "@react-three/rapier";
import { Vector3 } from "three";
import { config as c } from "../config";
import { Ball } from "./Ball";
import { ShotPaths } from "./ShotPaths";
import {
  createTrailBuffer,
  appendTrailSample,
  type TrailBuffer,
  type ShotVisualDiagnostics,
} from "../domain/shotVisuals";
import type { ShotBridge } from "../input/useShotInput";
import {
  advanceBasket,
  createBasketState,
  type BasketState,
} from "../domain/scoring";
import { solveBallistic } from "../domain/launch";
import { createPracticeLifecycle } from "../domain/practice";
import { resolveShot, shouldRetire } from "../domain/shot";
import type { Sample, Contact } from "../domain/types";
import { usePracticeStore as store } from "../store";
import { sessionLog } from "../debug/sessionLog";
import type { ShotAudio } from "../audio/shotAudio";
import { netPose, type ShotFeedback } from "../domain/shotFeedback";
import { hasPhysicalContact } from "../domain/physicalContact";
type Flight = {
  prev: Sample;
  basket: BasketState;
  trace: Sample[];
  contacts: Contact[];
  handles: Set<number>;
  launchedAt: number;
  resolved: boolean;
  trail: TrailBuffer;
};
export type DebugSnapshot = {
  ready: boolean;
  phase: string;
  sessionId: number;
  attempts: number;
  makes: number;
  simTime: number;
  bodyCount: number;
  dynamicCount: number;
  worldBodies: number;
  ballScreen: ShotBridge["screen"];
  shotVisuals: ShotVisualDiagnostics | null;
  rewards: {
    audio: ReturnType<ShotAudio["snapshot"]>;
    feedback: ReturnType<ShotFeedback["snapshot"]>;
    netPose: ReturnType<typeof netPose>;
  };
  width: number;
  height: number;
  active: {
    id: number;
    position: Sample["position"];
    velocity: Sample["velocity"];
  } | null;
  projection: {
    ball: { x: number; y: number };
    rim: { x: number; y: number };
    apex: { x: number; y: number };
  };
};
declare global {
  interface Window {
    afterHours3D?: {
      snapshot: () => DebugSnapshot;
      session: () => {
        shots: import("../debug/sessionLog").ShotLog[];
        source: string;
      };
    };
  }
}
export function PracticeScene({
  bridge,
  onReady,
  sessionId,
  audio,
  feedback,
}: {
  bridge: RefObject<ShotBridge>;
  onReady: () => void;
  sessionId: number;
  audio: ShotAudio;
  feedback: ShotFeedback;
}) {
  const [life] = useState(() => createPracticeLifecycle(c)),
    [ids, setIds] = useState([1]);
  const bodies = useRef(new Map<number, RapierRigidBody>()),
    flights = useRef(new Map<number, Flight>());
  const { rapier, world } = useRapier(),
    { camera, size } = useThree();
  const register = useCallback(
    (id: number, body: RapierRigidBody | null) => {
      if (body) {
        bodies.current.set(id, body);
        onReady();
      } else bodies.current.delete(id);
      bridge.current.ready =
        life.readyId !== null &&
        bodies.current.has(life.readyId) &&
        store.getState().phase !== "paused";
    },
    [bridge, life, onReady],
  );
  useLayoutEffect(() => {
    const o = c.ball.origin,
      p = new Vector3(o.x, o.y, o.z).project(camera),
      edge = new Vector3(o.x + c.ball.radius, o.y, o.z).project(camera);
    bridge.current.screen = {
      x: ((p.x + 1) / 2) * size.width,
      y: ((1 - p.y) / 2) * size.height,
      radius: (Math.abs(edge.x - p.x) / 2) * size.width,
    };
  }, [bridge, camera, size]);
  useEffect(() => {
    sessionLog?.reset();
    feedback.reset();
    audio.stop();
    bridge.current.aiming = (active) => store.getState().setAiming(active);
    bridge.current.launch = (launch, gesture) => {
      const id = life.readyId,
        b = id === null ? null : bodies.current.get(id);
      if (
        !b ||
        id === null ||
        store.getState().phase === "paused" ||
        store.getState().sessionId !== sessionId
      )
        return false;
      if (life.launch() === null) return false;
      bridge.current.ready = false;
      b.setBodyType(rapier.RigidBodyType.Dynamic, true);
      b.setLinvel(launch.velocity, true);
      b.setAngvel(launch.angularVelocity, true);
      const prev: Sample = {
        position: { ...b.translation() },
        velocity: { ...launch.velocity },
        time: 0,
      };
      const trail = createTrailBuffer(c.shotVisuals.trail.points);
      appendTrailSample(trail, prev, c.shotVisuals.trail.sampleInterval);
      flights.current.set(id, {
        prev,
        basket: createBasketState(),
        trace: [prev],
        contacts: [],
        handles: new Set(),
        launchedAt: life.time,
        resolved: false,
        trail,
      });
      store.getState().recordLaunch(sessionId, id);
      feedback.launch(id);
      sessionLog?.recordLaunch({
        sessionId,
        shotId: id,
        gesture,
        launch,
        origin: prev.position,
      });
      sessionLog?.recordSample(id, prev);
      return true;
    };
    return () => {
      bridge.current.launch = null;
      bridge.current.aiming = undefined;
      bridge.current.ready = false;
    };
  }, [bridge, life, rapier, sessionId, feedback, audio]);
  useAfterPhysicsStep(() => {
    if (
      store.getState().sessionId !== sessionId ||
      store.getState().phase === "paused"
    )
      return;
    if (life.step(c.timeStep)) {
      setIds(life.balls.map((b) => b.id));
      for (const id of flights.current.keys())
        if (!life.balls.some((b) => b.id === id)) flights.current.delete(id);
      if (life.readyId !== null) store.getState().recordReady(sessionId);
    }
    feedback.step(life.time);
    for (const [id, s] of flights.current) {
      const body = bodies.current.get(id);
      if (!body) continue;
      const next: Sample = {
        position: { ...body.translation() },
        velocity: { ...body.linvel() },
        time: life.time - s.launchedAt,
      };
      appendTrailSample(s.trail, next, c.shotVisuals.trail.sampleInterval);
      if (s.resolved) continue;
      const handles = new Set<number>(),
        collider = body.collider(0);
      // Collision events dispatch after all render-frame substeps. Read physical contacts
      // here so a rim contact is known before same-step basket feedback is classified.
      world.contactPairsWith(collider, (other) => {
        const kind = (
          other.parent()?.userData as { kind?: Contact["kind"] } | undefined
        )?.kind;
        if (!kind) return;
        let touching = false;
        world.contactPair(collider, other, (manifold) => {
          if (hasPhysicalContact(manifold)) touching = true;
        });
        if (!touching) return;
        handles.add(other.handle);
        if (!s.handles.has(other.handle)) {
          const contact: Contact = {
            kind,
            time: next.time,
            position: next.position,
            before: s.prev.velocity,
            after: next.velocity,
          };
          s.contacts.push(contact);
          feedback.contact(id, contact);
          sessionLog?.recordContact(id, contact);
        }
      });
      s.handles = handles;
      s.trace.push(next);
      sessionLog?.recordSample(id, next);
      const a = advanceBasket(
        s.basket,
        s.prev,
        next,
        s.contacts.some((k) => k.kind === "floor"),
        c,
      );
      if (a.state.armed && !s.basket.armed)
        sessionLog?.recordCrossing(id, next.time, "above");
      if (a.state.crossed && !s.basket.crossed)
        sessionLog?.recordCrossing(id, next.time, "rim");
      if (a.made) sessionLog?.recordCrossing(id, next.time, "lower-confirmed");
      s.basket = a.state;
      s.prev = next;
      if (a.made || shouldRetire(next, s.contacts, next.time, c)) {
        s.resolved = true;
        const result = resolveShot(s.trace, s.contacts, a.made, c);
        life.resolve(id, result);
        store.getState().recordResult(sessionId, id, result);
        feedback.result(id, result, next, life.time);
        sessionLog?.recordResult(id, result);
      }
    }
    bridge.current.ready =
      life.readyId !== null &&
      bodies.current.has(life.readyId) &&
      store.getState().phase !== "paused";
  });
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const project = (p: Sample["position"]) => {
      const v = new Vector3(p.x, p.y, p.z).project(camera);
      return {
        x: ((v.x + 1) / 2) * size.width,
        y: ((1 - v.y) / 2) * size.height,
      };
    };
    const v = solveBallistic(
        c.ball.origin,
        c.hoop.center,
        c.launch.apex,
        c.gravity,
      ),
      at = v.y / c.gravity;
    const api = Object.freeze({
      snapshot: (): DebugSnapshot => {
        const s = store.getState(),
          id = life.readyId ?? s.currentShotId,
          b = id === null ? null : bodies.current.get(id);
        return {
          ready: bridge.current.ready,
          phase: s.phase,
          sessionId,
          attempts: s.attempts,
          makes: s.makes,
          simTime: life.time,
          bodyCount: bodies.current.size,
          dynamicCount: [...bodies.current.values()].filter((b) =>
            b.isDynamic(),
          ).length,
          worldBodies: world.bodies.len(),
          ballScreen: bridge.current.screen
            ? { ...bridge.current.screen }
            : null,
          shotVisuals: bridge.current.visuals
            ? {
                ...bridge.current.visuals,
                previewVelocity: bridge.current.visuals.previewVelocity
                  ? { ...bridge.current.visuals.previewVelocity }
                  : null,
              }
            : null,
          rewards: {
            audio: audio.snapshot(),
            feedback: feedback.snapshot(),
            netPose: netPose(feedback.net, life.time, c),
          },
          width: size.width,
          height: size.height,
          active:
            b && id !== null
              ? {
                  id,
                  position: { ...b.translation() },
                  velocity: { ...b.linvel() },
                }
              : null,
          projection: {
            ball: project(c.ball.origin),
            rim: project(c.hoop.center),
            apex: project({
              x: c.ball.origin.x + v.x * at,
              y: c.launch.apex,
              z: c.ball.origin.z + v.z * at,
            }),
          },
        };
      },
      session: () =>
        JSON.parse(
          sessionLog?.exportSession() ?? '{"shots":[],"source":"human"}',
        ),
    });
    window.afterHours3D = api;
    return () => {
      if (window.afterHours3D === api) delete window.afterHours3D;
    };
  }, [bridge, camera, life, sessionId, size, world, audio, feedback]);
  return (
    <>
      {ids.map((id) => (
        <Ball key={id} id={id} register={register} />
      ))}
      <ShotPaths bridge={bridge} flights={flights} clock={life} />
    </>
  );
}
