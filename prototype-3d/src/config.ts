import { activeTuning, launchTuningPresets } from "./tuning";
/** Metres, seconds, kilograms. All gameplay tuning belongs here. */
export const config = {
  gravity: 9.81,
  timeStep: 1 / 120,
  ball: {
    origin: { x: 0, y: 1.35, z: 4.2 },
    radius: 0.12,
    mass: 0.62,
    restitution: 0.65,
    friction: 0.35,
    backspin: -7,
  },
  hoop: {
    center: { x: 0, y: 3.05, z: 0 },
    innerRadius: 0.232,
    tubeRadius: 0.017,
    segments: 32,
    restitution: 0.45,
  },
  board: {
    center: { x: 0, y: 3.65, z: -0.43 },
    size: { x: 1.8, y: 1.05, z: 0.06 },
    restitution: 0.6,
  },
  court: { width: 14, length: 18, centerZ: 1, floorRestitution: 0.72 },
  launch: {
    apex: 4.1,
    minUp: 0.055,
    normalUp: 0.3,
    ...launchTuningPresets[activeTuning],
    outerDepth: 3.6,
    maxDepth: 1.2,
    aimDeadzone: 0.018,
    aimSensitivity: 3.2,
    aimExponent: 1.3,
    maxAim: 1.4,
  },
  camera: {
    position: [0, 2.05, 6.1] as [number, number, number],
    target: [0, 2.1, 0] as [number, number, number],
    fov: 54,
    dpr: 1.5,
    maxWidth: 480,
  },
  feedback: {
    netDuration: 0.28,
    netHeight: 0.44,
    netStretch: 0.12,
    impactCooldown: 0.075,
    audioGain: 0.38,
  },
  shotVisuals: {
    preview: {
      points: 36,
      startTime: 0.018,
      endBelowRim: 0.18,
      nearRadius: 0.009,
      farRadius: 0.012,
      idleOpacity: 0.14,
      aimOpacity: 0.55,
    },
    trail: {
      points: 24,
      duration: 0.32,
      sampleInterval: 1 / 60,
      radius: 0.026,
      opacity: 0.26,
    },
  },
  recovery: {
    make: 0.35,
    miss: 0.15,
    maxAge: 5,
    maxBodies: 3,
    retireLow: 1.3,
    retireDistance: 1.1,
    bounds: 9,
  },
  debug: { maxShots: 100, sampleInterval: 1 / 30, maxSamples: 180 },
} satisfies Record<string, unknown>;
export type GameConfig = typeof config;
export const BALL_GROUPS = (1 << 16) | 2;
export const COURT_GROUPS = (2 << 16) | 1;
