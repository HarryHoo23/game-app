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
  const read = (
    id: number,
    x: number,
    y: number,
    time: number,
  ): Gesture | null => {
    if (
      !start ||
      id !== start.pointerId ||
      (start.y - y) / start.height < c.launch.minUp
    )
      return null;
    return {
      start: { x: start.x, y: start.y },
      end: { x, y },
      width: start.width,
      height: start.height,
      durationMs: Math.max(1, time - start.time),
    };
  };
  return {
    begin(s: Start) {
      if (start || !s.primary || s.width <= 0 || s.height <= 0) return false;
      start = { ...s };
      return true;
    },
    move(id: number, x: number, y: number, time = (start?.time ?? 0) + 1) {
      return read(id, x, y, time);
    },
    end(id: number, x: number, y: number, time: number): Gesture | null {
      if (!start || id !== start.pointerId) return null;
      const result = read(id, x, y, time);
      start = null;
      return result;
    },
    cancel() {
      start = null;
    },
  };
}
