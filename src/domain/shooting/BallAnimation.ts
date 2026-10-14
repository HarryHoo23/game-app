import { shotFeel } from "../../data/shotFeel";
export function ballDeformation(aimPower: number, releaseMs: number | null) {
  if (releaseMs !== null) {
    if (releaseMs <= 0 || releaseMs >= shotFeel.releaseMs)
      return { x: 1, y: 1 };
    const stretch =
      Math.sin((Math.PI * releaseMs) / shotFeel.releaseMs) *
      shotFeel.releaseStretch;
    return { x: 1 - stretch, y: 1 + stretch };
  }
  const squash = Math.max(0, Math.min(1, aimPower)) * shotFeel.aimSquash;
  return { x: 1 + squash, y: 1 - squash };
}
