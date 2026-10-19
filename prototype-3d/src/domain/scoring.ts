import type { GameConfig } from "../config";
import type { Sample, Vec3 } from "./types";
export type BasketState = {
  armed: boolean;
  crossed: boolean;
  scored: boolean;
  grounded: boolean;
};
export function createBasketState(): BasketState {
  return { armed: false, crossed: false, scored: false, grounded: false };
}
export function crossing(
  prev: Sample,
  next: Sample,
  height: number,
): Vec3 | null {
  if (
    prev.position.y <= height ||
    next.position.y > height ||
    next.position.y >= prev.position.y
  )
    return null;
  const t = (height - prev.position.y) / (next.position.y - prev.position.y);
  return {
    x: prev.position.x + (next.position.x - prev.position.x) * t,
    y: height,
    z: prev.position.z + (next.position.z - prev.position.z) * t,
  };
}
export function advanceBasket(
  state: BasketState,
  prev: Sample,
  next: Sample,
  grounded: boolean,
  c: GameConfig,
): { state: BasketState; made: boolean } {
  const s = { ...state, grounded: state.grounded || grounded };
  if (s.scored || s.grounded) return { state: s, made: false };
  const h = c.hoop.center.y;
  if (
    Math.max(prev.position.y, next.position.y) >=
    h + c.ball.radius + c.hoop.tubeRadius
  )
    s.armed = true;
  if (next.position.y >= prev.position.y) {
    s.crossed = false;
    return { state: s, made: false };
  }
  const atRim = crossing(prev, next, h);
  if (atRim) {
    const clearance = c.hoop.innerRadius - c.ball.radius;
    s.crossed =
      s.armed &&
      Math.hypot(atRim.x - c.hoop.center.x, atRim.z - c.hoop.center.z) <=
        clearance;
  }
  const lower = crossing(
    prev,
    next,
    h - c.ball.radius - c.hoop.tubeRadius - 0.02,
  );
  if (lower) {
    s.scored =
      s.crossed &&
      Math.hypot(lower.x - c.hoop.center.x, lower.z - c.hoop.center.z) <=
        c.hoop.innerRadius + c.ball.radius;
    s.crossed = false;
  }
  return { state: s, made: s.scored };
}
