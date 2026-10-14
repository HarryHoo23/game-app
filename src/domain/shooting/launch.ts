import type { Stats } from "../progression/progress";
export function launchVector(dx: number, dy: number, stats: Stats) {
  const d = Math.hypot(dx, dy);
  if (d < 18 || dy > -10) return null;
  const raw = Math.min(d / 170, 1);
  const power = raw + stats.powerControl * raw * (1 - raw);
  const speed = stats.maxSpeed * power;
  return { x: (dx / d) * speed, y: (dy / d) * speed };
}
