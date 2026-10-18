import {
  sampleShot,
  type ShotPlan,
  type ShotPose,
  type ShotResult,
} from "../../domain/shooting/ShotTrajectory";
import type { LevelConfig } from "../../data/levels";
import { ballContactRadius } from "../../data/ballGeometry";
import { HoopSensors } from "./HoopSensors";
import { shotFeel } from "../../data/shotFeel";
/** Continuous controlled descent through the visible net, then handoff to residual Matter physics. */
export class HoopPass {
  private plan: ShotPlan | null = null;
  private arrival?: ShotPose;
  private elapsed = 0;
  private done = true;
  private glancingArrival = false;
  sensors: HoopSensors;
  constructor(private level: LevelConfig) {
    this.sensors = new HoopSensors(
      { x: level.hoopX, y: level.hoopY },
      ballContactRadius(shotFeel.hoopScale),
    );
  }
  get active() {
    return !this.done;
  }
  get elapsedMs() {
    return this.elapsed;
  }
  get stage() {
    return this.sensors.stage;
  }
  get contacts() {
    return this.sensors.contacts;
  }
  get pose(): ShotPose | undefined {
    if (!this.arrival || !this.plan) return undefined;
    const m = this.elapsed,
      c = shotFeel.passMotion,
      a = this.arrival,
      perMs = 1 / (1000 / 60),
      decay = Math.exp(-m / c.lateralDampingMs),
      t = Math.min(1, m / c.maxMs);
    // A bounded pull through the net ramps velocity continuously, then relaxes
    // acceleration so the lower apex need not create a slow basket entry.
    const accelerationDecay = Math.exp(-m / c.accelerationDecayMs),
      addedSpeed = c.gravity * c.accelerationDecayMs,
      fallDistance =
        addedSpeed * (m - c.accelerationDecayMs * (1 - accelerationDecay));
    const offset = a.x - this.level.hoopX;
    const contact = this.glancingArrival;
    // Preserve the existing normal-make passage policy. An arrival quality
    // classification is not proof of a Matter collision and triggers no clank.
    const k = 1 / c.lateralDampingMs;
    const contactX =
      this.level.hoopX +
      (offset + (a.velocity.x * perMs + offset * k) * m) * decay;
    return {
      ...a,
      x: contact
        ? contactX
        : a.x + a.velocity.x * perMs * c.lateralDampingMs * (1 - decay),
      y: a.y + a.velocity.y * perMs * m + fallDistance,
      rotation: a.rotation + a.angularVelocity * perMs * m,
      scale: a.scale + (c.exitScale - a.scale) * t * t * (3 - 2 * t),
      velocity: {
        x: contact
          ? ((a.velocity.x * perMs +
              offset * k -
              k * (offset + (a.velocity.x * perMs + offset * k) * m)) *
              decay) /
            perMs
          : a.velocity.x * decay,
        y: a.velocity.y + addedSpeed * (1 - accelerationDecay) * (1000 / 60),
      },
    };
  }
  start(plan: ShotPlan, result: ShotResult) {
    this.reset();
    if (!result.made) return false;
    this.plan = plan;
    this.arrival = sampleShot(plan, 1);
    this.done = false;
    this.glancingArrival = result.quality === "normal";
    this.sensors = new HoopSensors(
      { x: this.level.hoopX, y: this.level.hoopY },
      ballContactRadius(plan.hoopScale),
    );
    // The approach may have crossed TOP already: carry the real descending segment into the sensors.
    this.sensors.sample(
      sampleShot(plan, shotFeel.passMotion.approachSample),
      this.arrival,
    );
    return true;
  }
  advance(deltaMs: number) {
    if (!this.active)
      return {
        pose: this.pose,
        entered: false,
        scored: false,
        finished: false,
      };
    const previous = this.pose!;
    this.elapsed = Math.min(
      shotFeel.passMotion.maxMs,
      this.elapsed + Math.max(0, deltaMs),
    );
    const pose = this.pose!;
    const event = this.sensors.sample(previous, pose);
    const finished = event.scored || this.elapsed >= shotFeel.passMotion.maxMs;
    if (finished) this.done = true;
    return { ...event, pose, finished };
  }
  reset() {
    this.plan = null;
    this.arrival = undefined;
    this.elapsed = 0;
    this.done = true;
    this.glancingArrival = false;
    this.sensors.reset();
  }
}
