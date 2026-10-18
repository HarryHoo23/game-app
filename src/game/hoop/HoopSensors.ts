import type { Vec } from "../../domain/scoring/basketDetector";
import { hoopLayout, type BallDepthState } from "./hoopLayout";
import { ballContactRadius } from "../../data/ballGeometry";
/** Swept, directional logical sensors for controlled 2.5D movement; no overlap-based awards. */
export class HoopSensors {
  stage: BallDepthState = "APPROACHING";
  contacts = { rim: false, backboard: false };
  private next = 0;
  private done = false;
  private invalid = false;
  constructor(
    readonly center: Vec,
    private radius: number,
  ) {}
  touch(type: "rim" | "backboard") {
    this.contacts[type] = true;
  }
  reset() {
    this.next = 0;
    this.done = false;
    this.invalid = false;
    this.stage = "APPROACHING";
    this.contacts = { rim: false, backboard: false };
  }
  sample(a: Vec & { scale?: number }, b: Vec & { scale?: number }) {
    let entered = false,
      scored = false;
    if (this.done || this.invalid)
      return { entered, scored, stage: this.stage };
    if (b.y < a.y) {
      this.invalid = true;
      return { entered, scored, stage: this.stage };
    }
    if (b.y === a.y) return { entered, scored, stage: this.stage };
    const offsets = [
      hoopLayout.sensors.top,
      hoopLayout.sensors.center,
      hoopLayout.sensors.exit,
    ];
    const inside = (x: number, t: number) => {
      const radius =
        a.scale !== undefined && b.scale !== undefined
          ? ballContactRadius(a.scale + (b.scale - a.scale) * t)
          : this.radius;
      return (
        Math.abs(x - this.center.x) <= hoopLayout.sensors.halfWidth - radius
      );
    };
    for (let i = this.next; i < offsets.length; i++) {
      const y = this.center.y + offsets[i];
      if (a.y >= y) {
        if (i === this.next) {
          this.invalid = true;
          break;
        }
        continue;
      }
      if (b.y < y) break;
      const x = a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y);
      if (!inside(x, (y - a.y) / (b.y - a.y))) {
        this.invalid = true;
        break;
      }
      this.next = i + 1;
      if (i === 0) this.stage = "AT_RIM";
      if (i === 1) {
        this.stage = "IN_NET";
        entered = true;
      }
      if (i === 2) {
        this.stage = "BELOW_HOOP";
        this.done = true;
        scored = true;
      }
    }
    if (this.next > 0 && !this.done && !inside(b.x, 1)) this.invalid = true;
    return { entered, scored, stage: this.stage };
  }
}
