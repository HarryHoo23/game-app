import { physics } from "../../data/physics";
import type { Stats } from "../progression/progress";
export function launchVector(dx: number, dy: number, stats: Stats) {
  dx *= physics.horizontalSensitivity;
  const d = Math.hypot(dx, dy);
  if (d < physics.minDrag || dy > -10) return null;
  const raw = Math.min(d / physics.maxDrag, 1);
  const power = raw + stats.powerControl * raw * (1 - raw);
  const speed = stats.maxSpeed * power;
  return { x: (dx / d) * speed, y: (dy / d) * speed };
}
