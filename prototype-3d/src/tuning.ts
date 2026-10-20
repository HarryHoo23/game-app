/** Development A/B overrides never change geometry, spin or scoring. */
export const launchTuningPresets: Record<
  "original" | "moderate" | "power",
  { model: "target" | "speed"; softBand: number; softDepth: number }
> = {
  original: { model: "target", softBand: 0.1, softDepth: 0.06 },
  moderate: { model: "target", softBand: 0.08, softDepth: 0.075 },
  power: { model: "speed", softBand: 0.08, softDepth: 0.075 },
};
export type TuningName = keyof typeof launchTuningPresets;
export function resolveTuningName(
  search: string,
  development: boolean,
): TuningName {
  const name = new URLSearchParams(search).get("tuning");
  return development && (name === "original" || name === "moderate")
    ? name
    : "power";
}
export const activeTuning = resolveTuningName(
  typeof window === "undefined" ? "" : window.location.search,
  import.meta.env.DEV,
);
