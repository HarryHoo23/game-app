import { ballContactRadius } from "./ballGeometry";
import { shotFeel } from "./shotFeel";
import { hoopLayout } from "./hoop";
/** Observation bounds are only fallbacks; runtime supplies actual body bounds. */
export const impactFeel = {
  upperOcclusionClearance: 46,
  contactZoneHalfWidth:
    hoopLayout.boardWidth / 2 + ballContactRadius(shotFeel.hoopScale),
  contactZoneBottom:
    ballContactRadius(shotFeel.hoopScale) + hoopLayout.rimRadius,
  maxMissObservationMs: 350,
  rimContactMaxWaitMs: 240,
} as const;
export const resultTiming = {
  missReadyMs: 450,
  makeReadyMs: 600,
  perfectReadyMs: 675,
} as const;
export const readyDelay = (score: number) =>
  score === 4
    ? resultTiming.perfectReadyMs
    : score > 0
      ? resultTiming.makeReadyMs
      : resultTiming.missReadyMs;
