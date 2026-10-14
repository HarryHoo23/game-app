import { hoopLayout as visual } from "../game/hoop/hoopLayout";
/** Canonical physical dimensions; independent of image canvas sizes. */
export const hoopLayout = {
  rimHalfWidth: visual.rimWidth / 2,
  clearHalfWidth: visual.sensors.halfWidth,
  rimRadius: 4,
  boardWidth: 228,
  boardTopOffset: -91,
  boardThickness: 7,
} as const;
