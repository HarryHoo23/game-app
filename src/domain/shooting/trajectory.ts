import { physics } from "../../data/physics";
import type { Vec } from "../scoring/basketDetector";
/** Free flight only: preview intentionally excludes any bounce prediction. */
export function predictTrajectory(velocity: Vec, steps = 64): Vec[] {
  const fraction = physics.stepMs / (1000 / 60);
  const dx = velocity.x * fraction;
  let dy = velocity.y * fraction;
  let x: number = physics.origin.x,
    y: number = physics.origin.y;
  const result: Vec[] = [];
  for (let i = 0; i < steps; i++) {
    dy += physics.gravity * physics.stepMs ** 2;
    x += dx;
    y += dy;
    result.push({ x, y });
  }
  return result;
}
