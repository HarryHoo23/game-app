import { sampleShot, type ShotPlan, type ShotPose } from "./ShotTrajectory";
export class ShotController {
  private plan: ShotPlan | null = null;
  private elapsed = 0;
  private delivered = false;
  get active() {
    return this.plan !== null && !this.delivered;
  }
  get currentPlan() {
    return this.plan;
  }
  get elapsedMs() {
    return this.elapsed;
  }
  get pose(): ShotPose | undefined {
    return this.plan
      ? sampleShot(this.plan, this.elapsed / this.plan.durationMs)
      : undefined;
  }
  launch(plan: ShotPlan) {
    if (this.active) return false;
    this.plan = plan;
    this.elapsed = 0;
    this.delivered = false;
    return true;
  }
  advance(deltaMs: number) {
    if (!this.plan || this.delivered)
      return { pose: this.pose, arrived: false };
    this.elapsed = Math.min(
      this.plan.durationMs,
      this.elapsed + Math.max(0, deltaMs),
    );
    const arrived = this.elapsed >= this.plan.durationMs;
    if (arrived) this.delivered = true;
    return { pose: this.pose, arrived };
  }
  reset() {
    this.plan = null;
    this.elapsed = 0;
    this.delivered = false;
  }
  /** End controlled motion at an actual eligible contact without changing the plan. */
  finishAt(progress: number) {
    if (!this.plan) return;
    this.elapsed = Math.max(0, Math.min(1, progress)) * this.plan.durationMs;
    this.delivered = true;
  }
}
