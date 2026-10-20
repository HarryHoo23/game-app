import { config as c } from "../config";
import type { Vec3 } from "./types";
export type ViewBasis = { right: Vec3; forward: Vec3 };
export type ShotContext = { origin: Vec3; basis: ViewBasis };
export type ShootingSpot = ShotContext & {
  id: string;
  name: string;
  shortName: string;
  angle: number;
  camera: Vec3;
  target: Vec3;
};
export const spotSettings = {
  radius: 4.2,
  ballsPerSpot: 2,
  cameraBehindBall: 2.2,
  cameraHeight: 2.05,
  cameraTargetHeight: 2.35,
  transitionSeconds: 0.65,
  feedbackSeconds: 0.45,
  order: ["left-corner", "left-wing", "top", "right-wing", "right-corner"],
} as const;
const definitions = [
  { id: "left-corner", name: "LEFT CORNER", shortName: "L CORNER", angle: 0 },
  { id: "left-wing", name: "LEFT WING", shortName: "L WING", angle: 45 },
  { id: "top", name: "TOP OF THE KEY", shortName: "TOP", angle: 90 },
  { id: "right-wing", name: "RIGHT WING", shortName: "R WING", angle: 135 },
  {
    id: "right-corner",
    name: "RIGHT CORNER",
    shortName: "R CORNER",
    angle: 180,
  },
];
/** 0/180 are the two baseline sides; 90 is the frontal/top position. */
export function createShootingSpots(
  radius: number = spotSettings.radius,
  order: readonly string[] = spotSettings.order,
): ShootingSpot[] {
  if (
    !Number.isFinite(radius) ||
    radius < 2 ||
    order.length !== 5 ||
    new Set(order).size !== 5 ||
    order.some((id) => !definitions.some((d) => d.id === id))
  )
    throw new RangeError(
      "Five unique shooting spots and a safe radius are required",
    );
  return order.map((id) => {
    const def = definitions.find((d) => d.id === id)!;
    const theta = (def.angle * Math.PI) / 180;
    const x = Math.abs(Math.cos(theta)) < 1e-10 ? 0 : -Math.cos(theta),
      z = Math.abs(Math.sin(theta)) < 1e-10 ? 0 : Math.sin(theta);
    return {
      ...def,
      origin: {
        x: c.hoop.center.x + x * radius,
        y: c.ball.origin.y,
        z: c.hoop.center.z + z * radius,
      },
      basis: { forward: { x: -x, y: 0, z: -z }, right: { x: z, y: 0, z: -x } },
      camera: {
        x: c.hoop.center.x + x * (radius + spotSettings.cameraBehindBall),
        y: spotSettings.cameraHeight,
        z: c.hoop.center.z + z * (radius + spotSettings.cameraBehindBall),
      },
      target: {
        x: c.hoop.center.x,
        y: spotSettings.cameraTargetHeight,
        z: c.hoop.center.z,
      },
    };
  });
}
export const shootingSpots = createShootingSpots();
export const TOTAL_SHOTS = shootingSpots.length * spotSettings.ballsPerSpot;
export const practiceSpot: ShootingSpot = {
  id: "practice",
  name: "UNLIMITED PRACTICE",
  shortName: "PRACTICE",
  angle: 90,
  origin: c.ball.origin,
  basis: { forward: { x: 0, y: 0, z: -1 }, right: { x: 1, y: 0, z: 0 } },
  camera: {
    x: c.camera.position[0],
    y: c.camera.position[1],
    z: c.camera.position[2],
  },
  target: {
    x: c.camera.target[0],
    y: c.camera.target[1],
    z: c.camera.target[2],
  },
};
export const activeSpot = (s: {
  mode: "practice" | "challenge";
  spotIndex: number;
}) => (s.mode === "practice" ? practiceSpot : shootingSpots[s.spotIndex]);
export function orbitPose(
  from: number,
  to: number,
  progress: number,
  spot: ShootingSpot,
) {
  const t = Math.max(0, Math.min(1, progress)),
    eased = t * t * (3 - 2 * t),
    angle = ((from + (to - from) * eased) * Math.PI) / 180;
  const radius = Math.hypot(
    spot.camera.x - c.hoop.center.x,
    spot.camera.z - c.hoop.center.z,
  );
  return {
    x: c.hoop.center.x - Math.cos(angle) * radius,
    y: spot.camera.y,
    z: c.hoop.center.z + Math.sin(angle) * radius,
  };
}
