import type { GameConfig } from "../config";
import type { Gesture } from "../domain/launch";
type Start = {
  pointerId: number;
  x: number;
  y: number;
  time: number;
  width: number;
  height: number;
  primary: boolean;
};
export function createPointerGesture(c: GameConfig) {
  let start: Start | null = null;
  return {
    begin(s: Start) {
      if (start || !s.primary || s.width <= 0 || s.height <= 0) return false;
      start = { ...s };
      return true;
    },
    move(_id: number, _x: number, _y: number) {
      /* Endpoints own launch. Movement never accumulates power. */
    },
    end(id: number, x: number, y: number, time: number): Gesture | null {
      if (!start || id !== start.pointerId) return null;
      const s = start;
      start = null;
      if ((s.y - y) / s.height < c.launch.minUp) return null;
      return {
        start: { x: s.x, y: s.y },
        end: { x, y },
        width: s.width,
        height: s.height,
        durationMs: time - s.time,
      };
    },
    cancel() {
      start = null;
    },
  };
}
