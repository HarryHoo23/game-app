import { config } from "../config";
import { activeTuning } from "../tuning";
import type { Gesture, Launch } from "../domain/launch";
import type { Contact, Sample, Vec3 } from "../domain/types";
import { isMake, type ShotResult } from "../domain/shot";
export type ShotLog = {
  spot?: { id: string; index: number; ballInSpot: number; angle: number };
  viewBasis?: import("../domain/spots").ViewBasis;
  tuning: { preset: string; softBand: number; softDepth: number };
  mappedTarget: { position: Vec3; screenRight: number; depth: number };
  sessionId: number;
  shotId: number;
  gesture: Gesture;
  launch: Launch;
  origin: Vec3;
  samples: Sample[];
  contacts: Contact[];
  result: ShotResult | null;
  made: boolean;
  crossings: { time: number; stage: string }[];
};
type LaunchRecord = Pick<
  ShotLog,
  | "sessionId"
  | "shotId"
  | "gesture"
  | "launch"
  | "origin"
  | "spot"
  | "viewBasis"
>;
export class SessionLog {
  private shots = new Map<number, ShotLog>();
  constructor(private source: "human" | "automation") {}
  reset() {
    this.shots.clear();
  }
  recordLaunch(record: LaunchRecord) {
    const { origin, launch } = record,
      v = launch.velocity,
      h = config.hoop.center;
    const time =
      (v.y + Math.sqrt(v.y * v.y - 2 * config.gravity * (h.y - origin.y))) /
      config.gravity;
    const position = {
      x: origin.x + v.x * time,
      y: h.y,
      z: origin.z + v.z * time,
    };
    const basis = record.viewBasis ?? {
      right: { x: 1, y: 0, z: 0 },
      forward: { x: 0, y: 0, z: -1 },
    };
    const dx = position.x - h.x,
      dz = position.z - h.z;
    this.shots.set(record.shotId, {
      ...record,
      tuning: {
        preset: activeTuning,
        softBand: config.launch.softBand,
        softDepth: config.launch.softDepth,
      },
      mappedTarget: {
        position,
        screenRight: dx * basis.right.x + dz * basis.right.z,
        depth: -(dx * basis.forward.x + dz * basis.forward.z),
      },
      samples: [],
      contacts: [],
      result: null,
      made: false,
      crossings: [],
    });
    if (this.shots.size > config.debug.maxShots)
      this.shots.delete(this.shots.keys().next().value!);
  }
  recordSample(id: number, s: Sample) {
    const shot = this.shots.get(id);
    if (!shot || shot.samples.length >= config.debug.maxSamples) return;
    const last = shot.samples.at(-1);
    if (!last || s.time - last.time >= config.debug.sampleInterval - 1e-7)
      shot.samples.push(s);
  }
  recordContact(id: number, c: Contact) {
    const shot = this.shots.get(id);
    if (shot && shot.contacts.length < 64) shot.contacts.push(c);
  }
  recordCrossing(id: number, time: number, stage: string) {
    const shot = this.shots.get(id);
    if (shot && shot.crossings.length < 32)
      shot.crossings.push({ time, stage });
  }
  recordResult(id: number, result: ShotResult) {
    const shot = this.shots.get(id);
    if (shot) {
      shot.result = result;
      shot.made = isMake(result);
    }
  }
  exportSession() {
    return JSON.stringify(
      {
        version: 2,
        tuning: activeTuning,
        guidance:
          "challenge: no idle path, first 0.55 seconds while aiming; practice: full",
        source: this.source,
        exportedAt: new Date().toISOString(),
        config,
        shots: [...this.shots.values()],
      },
      null,
      2,
    );
  }
}
export async function copySession(
  text: string,
  copy: (text: string) => Promise<void>,
  download: (text: string) => void,
): Promise<"copied" | "downloaded"> {
  try {
    await copy(text);
    return "copied";
  } catch {
    download(text);
    return "downloaded";
  }
}
export const sessionLog =
  import.meta.env.DEV && typeof window !== "undefined"
    ? new SessionLog(
        new URLSearchParams(window.location.search).has("automation")
          ? "automation"
          : "human",
      )
    : null;
