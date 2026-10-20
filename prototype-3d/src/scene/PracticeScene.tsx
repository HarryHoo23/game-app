import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type RefObject,
} from "react";
import { useThree, useFrame } from "@react-three/fiber";
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
import { activeSpot, spotSettings, type ShotContext } from "../domain/spots";
import { mapGesture, solveBallistic } from "../domain/launch";
import { createPracticeLifecycle } from "../domain/practice";
import { resolveShot, shouldRetire } from "../domain/shot";
import type { Sample, Contact, Vec3 } from "../domain/types";
import { usePracticeStore as store } from "../store";
import { sessionLog } from "../debug/sessionLog";
import type { ShotAudio } from "../audio/shotAudio";
import { type ShotFeedback } from "../domain/shotFeedback";
import { hasPhysicalContact } from "../domain/physicalContact";
import { artUploadCount } from "./artGeometry";
type Flight = {
  prev: Sample;
  basket: BasketState;
  trace: Sample[];
  contacts: Contact[];
  handles: Set<number>;
  launchedAt: number;
  resolved: boolean;
  trail: TrailBuffer;
  context: ShotContext;
};
export type DebugSnapshot = {
  ready: boolean;
  phase: string;
  sessionId: number;
  attempts: number;
  makes: number;
  mode: "practice" | "challenge";
  spotIndex: number;
  ballInSpot: number;
  outcomes:
    | import("../domain/shot").ShotResult[]
    | (import("../domain/shot").ShotResult | null)[];
  origin: Vec3;
  spot: { id: string; name: string; angle: number };
  camera: { position: Vec3; right: Vec3 };
  best: number;
  simTime: number;
  bodyCount: number;
  dynamicCount: number;
  worldBodies: number;
  render: {
    geometries: number;
    textures: number;
    calls: number;
    artUploads: number;
  };
  ballScreen: ShotBridge["screen"];
  shotVisuals: ShotVisualDiagnostics | null;
  rewards: {
    audio: ReturnType<ShotAudio["snapshot"]>;
    feedback: ReturnType<ShotFeedback["snapshot"]>;
    netPose: ShotFeedback["pose"];
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
  const origins = useRef(
    new Map<number, Vec3>([[1, activeSpot(store.getState()).origin]]),
  );
  const settleAt = useRef<number | null>(null);
  const bodies = useRef(new Map<number, RapierRigidBody>()),
    flights = useRef(new Map<number, Flight>());
  const { rapier, world } = useRapier(),
    { camera, size, gl } = useThree();
  const register = useCallback(
    (id: number, body: RapierRigidBody | null) => {
      if (body) {
        bodies.current.set(id, body);
        onReady();
      } else bodies.current.delete(id);
      bridge.current.ready =
        store.getState().sessionId === sessionId &&
        life.readyId !== null &&
        bodies.current.has(life.readyId) &&
        (store.getState().phase === "ready" ||
          store.getState().phase === "aiming");
    },
    [bridge, life, onReady, sessionId],
  );
  useFrame(() => {
    const context = activeSpot(store.getState()),
      o = context.origin;
    bridge.current.context = context;
    const p = new Vector3(o.x, o.y, o.z).project(camera),
      edge = new Vector3(
        o.x + context.basis.right.x * c.ball.radius,
        o.y,
        o.z + context.basis.right.z * c.ball.radius,
      ).project(camera);
    bridge.current.screen = {
      x: ((p.x + 1) / 2) * size.width,
      y: ((1 - p.y) / 2) * size.height,
      radius:
        Math.hypot((edge.x - p.x) * size.width, (edge.y - p.y) * size.height) /
        2,
    };
  });
  useEffect(() => {
    sessionLog?.reset();
    feedback.reset();
    audio.stop();
    bridge.current.mapGesture = (g) =>
      mapGesture(g, c, activeSpot(store.getState()));
    bridge.current.aiming = (active) => store.getState().setAiming(active);
    bridge.current.launch = (launch, gesture) => {
      const id = life.readyId,
        b = id === null ? null : bodies.current.get(id);
      if (
        !b ||
        id === null ||
        (store.getState().phase !== "ready" &&
          store.getState().phase !== "aiming") ||
        store.getState().sessionId !== sessionId
      )
        return false;
      if (life.launch() === null) return false;
      if (!store.getState().recordLaunch(sessionId, id)) return false;
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
        context: activeSpot(store.getState()),
      });
      feedback.launch(id);
      sessionLog?.recordLaunch({
        sessionId,
        shotId: id,
        gesture,
        launch,
        origin: prev.position,
        spot: {
          id: activeSpot(store.getState()).id,
          index: store.getState().spotIndex,
          ballInSpot: store.getState().ballInSpot,
          angle: activeSpot(store.getState()).angle,
        },
        viewBasis: activeSpot(store.getState()).basis,
      });
      sessionLog?.recordSample(id, prev);
      return true;
    };
    return () => {
      bridge.current.launch = null;
      bridge.current.mapGesture = undefined;
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
      for (const b of life.balls)
        if (!origins.current.has(b.id))
          origins.current.set(b.id, activeSpot(store.getState()).origin);
      setIds(life.balls.map((b) => b.id));
      for (const id of flights.current.keys())
        if (!life.balls.some((b) => b.id === id)) {
          flights.current.delete(id);
          origins.current.delete(id);
        }
      if (life.readyId !== null) store.getState().recordReady(sessionId);
    }
    if (settleAt.current !== null && life.time >= settleAt.current) {
      store.getState().settle(sessionId);
      settleAt.current = null;
    }
    if (
      store.getState().mode === "challenge" &&
      store.getState().phase === "ready" &&
      life.readyId === null
    ) {
      const id = life.prepare();
      if (id !== null) {
        origins.current.set(id, activeSpot(store.getState()).origin);
        setIds(life.balls.map((b) => b.id));
        // prepare() also trims the pool; retire the corresponding diagnostic data.
        for (const old of flights.current.keys())
          if (!life.balls.some((b) => b.id === old)) {
            flights.current.delete(old);
            origins.current.delete(old);
          }
      }
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
      if (store.getState().phase !== "changingSpot")
        feedback.passage(id, s.prev, next);
      if (s.resolved) {
        s.prev = next;
        continue;
      }
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
        const result = resolveShot(
          s.trace,
          s.contacts,
          a.made,
          c,
          s.context.basis,
        );
        if (!store.getState().recordResult(sessionId, id, result)) continue;
        const state = store.getState();
        life.resolve(id, result, state.mode === "practice");
        if (state.phase === "completed") life.finish();
        else if (state.mode === "challenge")
          settleAt.current =
            life.time +
            (state.ballInSpot === 1
              ? spotSettings.feedbackSeconds
              : a.made
                ? c.recovery.make
                : c.recovery.miss);
        feedback.result(id, result, next, life.time);
        sessionLog?.recordResult(id, result);
      }
    }
    bridge.current.ready =
      life.readyId !== null &&
      bodies.current.has(life.readyId) &&
      (store.getState().phase === "ready" ||
        store.getState().phase === "aiming");
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
    const api = Object.freeze({
      snapshot: (): DebugSnapshot => {
        const s = store.getState(),
          id = life.readyId ?? s.currentShotId,
          b = id === null ? null : bodies.current.get(id),
          context = activeSpot(s),
          v = solveBallistic(
            context.origin,
            c.hoop.center,
            c.launch.apex,
            c.gravity,
          ),
          at = v.y / c.gravity;
        const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        return {
          ready: bridge.current.ready,
          phase: s.phase,
          sessionId,
          attempts: s.attempts,
          makes: s.makes,
          mode: s.mode,
          spotIndex: s.spotIndex,
          ballInSpot: s.ballInSpot,
          outcomes: [...s.outcomes],
          origin: context.origin,
          spot: { id: context.id, name: context.name, angle: context.angle },
          camera: {
            position: {
              x: camera.position.x,
              y: camera.position.y,
              z: camera.position.z,
            },
            right: { x: right.x, y: right.y, z: right.z },
          },
          best: s.best,
          simTime: life.time,
          bodyCount: bodies.current.size,
          dynamicCount: [...bodies.current.values()].filter((b) =>
            b.isDynamic(),
          ).length,
          worldBodies: world.bodies.len(),
          render: {
            geometries: gl.info.memory.geometries,
            textures: gl.info.memory.textures,
            calls: gl.info.render.calls,
            artUploads: artUploadCount(),
          },
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
            netPose: { ...feedback.pose },
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
            ball: project(context.origin),
            rim: project(c.hoop.center),
            apex: project({
              x: context.origin.x + v.x * at,
              y: c.launch.apex,
              z: context.origin.z + v.z * at,
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
  }, [bridge, camera, life, sessionId, size, world, audio, feedback, gl]);
  return (
    <>
      {ids.map((id) => (
        <Ball
          key={id}
          id={id}
          origin={origins.current.get(id)}
          register={register}
        />
      ))}
      <ShotPaths bridge={bridge} flights={flights} clock={life} />
    </>
  );
}
