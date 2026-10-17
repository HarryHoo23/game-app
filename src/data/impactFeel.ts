import { physics } from "./physics";
import { hoopLayout } from "./hoop";
/** Physical handoff velocities use Matter's pixels-per-60Hz-tick convention. */
export const impactFeel = {
  front: { x: -3.4, y: -5.2 },
  back: { x: 5.8, y: 10.5 },
  upperOcclusionClearance: 46,
  backContactLead: 28,
  frontContactLead: 6,
  contactZoneHalfWidth: hoopLayout.boardWidth / 2 + physics.ballRadius,
  contactZoneBottom: physics.ballRadius + hoopLayout.rimRadius,
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
