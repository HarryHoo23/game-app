import type { LevelConfig } from "../../data/levels";
export const points = (contact: boolean, perfect: boolean) =>
  contact ? 2 : perfect ? 4 : 3;
export function stars(score: number, target: number) {
  return score >= Math.ceil(target * 1.4)
    ? 3
    : score >= Math.ceil(target * 1.2)
      ? 2
      : score >= target
        ? 1
        : 0;
}
export class LevelSession {
  score = 0;
  remaining: number;
  inFlight = false;
  streak = 0;
  constructor(readonly config: LevelConfig) {
    this.remaining = config.totalShots;
  }
  get finished() {
    return this.remaining === 0 && !this.inFlight;
  }
  launch() {
    if (this.inFlight || this.remaining <= 0) return false;
    this.remaining--;
    this.inFlight = true;
    return true;
  }
  resolve(score: number) {
    if (!this.inFlight) return;
    this.score += Math.floor(score * this.config.scoreMultiplier);
    this.streak = score ? this.streak + 1 : 0;
    this.inFlight = false;
  }
}
