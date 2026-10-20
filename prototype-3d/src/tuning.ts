/** Development A/B overrides never change geometry, spin or scoring. */
export const launchTuningPresets = {
  original: { softBand: 0.1, softDepth: 0.06 },
  moderate: { softBand: 0.08, softDepth: 0.075 },
};
export type TuningName = keyof typeof launchTuningPresets;
export function resolveTuningName(
  search: string,
  development: boolean,
): TuningName {
  return development && new URLSearchParams(search).get("tuning") === "original"
    ? "original"
    : "moderate";
}
export const activeTuning = resolveTuningName(
  typeof window === "undefined" ? "" : window.location.search,
  import.meta.env.DEV,
);
