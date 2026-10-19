import { config as c, type GameConfig } from "../config";
import type { SoundKind } from "../audio/synthesis";
import { isMake, type ShotResult } from "./shot";
import type { Contact, Sample, Vec3 } from "./types";
export type NetPulse = {
  result: "swish" | "rim-make" | "board-make";
  at: number;
  position: Vec3;
  velocity: Vec3;
};
export function netPose(
  pulse: NetPulse | null,
  now: number,
  config: GameConfig,
) {
  const rest = { stretch: 0, x: 0, z: 0 };
  if (!pulse) return rest;
  const age = (now - pulse.at) / config.feedback.netDuration;
  if (age <= 0 || age >= 1 - 1e-8) return rest;
  // Fast draw-through and eased recovery; rim attachment never moves.
  const envelope =
    age < 0.28
      ? Math.sin(((age / 0.28) * Math.PI) / 2)
      : Math.cos((((age - 0.28) / 0.72) * Math.PI) / 2) *
        Math.exp(-(age - 0.28) * 2);
  const strength =
    pulse.result === "swish" ? 1 : pulse.result === "rim-make" ? 0.68 : 0.76;
  return {
    stretch: config.feedback.netStretch * envelope * strength,
    x:
      Math.max(
        -0.065,
        Math.min(
          0.065,
          (pulse.position.x - config.hoop.center.x) * 0.4 +
            pulse.velocity.x * 0.018,
        ),
      ) * envelope,
    z:
      Math.max(
        -0.055,
        Math.min(
          0.055,
          (pulse.position.z - config.hoop.center.z) * 0.25 +
            pulse.velocity.z * 0.014,
        ),
      ) * envelope,
  };
}
export function createShotFeedback(audio: {
  play: (kind: SoundKind, strength?: number) => unknown;
}) {
  let net: NetPulse | null = null,
    activeId: number | null = null,
    resolved = false,
    time = 0;
  const contacts = new Map<string, number>();
  const events: { kind: SoundKind; shotId: number }[] = [];
  const play = (kind: SoundKind, shotId: number, strength = 1) => {
    events.push({ kind, shotId });
    if (events.length > 32) events.shift();
    audio.play(kind, strength);
  };
  return {
    get net() {
      return net;
    },
    get time() {
      return time;
    },
    step(now: number) {
      time = now;
    },
    launch(id: number) {
      activeId = id;
      resolved = false;
      contacts.clear();
      play("release", id, 0.65);
    },
    contact(id: number, contact: Contact) {
      if (id !== activeId || resolved || contact.kind === "floor") return;
      const key = contact.kind,
        previous = contacts.get(key) ?? -Infinity;
      const before = contact.before,
        after = contact.after;
      if (!before || !after) return;
      const impact = Math.hypot(
        after.x - before.x,
        after.y - before.y,
        after.z - before.z,
      );
      if (impact < 0.2 || contact.time - previous < c.feedback.impactCooldown)
        return;
      contacts.set(key, contact.time);
      play(contact.kind, id, Math.min(0.9, 0.22 + impact * 0.065));
    },
    result(id: number, result: ShotResult, sample: Sample, now: number) {
      if (id !== activeId || resolved) return;
      resolved = true;
      if (!isMake(result)) return;
      net = {
        result: result as NetPulse["result"],
        at: now,
        position: { ...sample.position },
        velocity: { ...sample.velocity },
      };
      play(
        result === "swish" ? "swish" : "make",
        id,
        result === "swish" ? 1 : 0.55,
      );
    },
    reset() {
      net = null;
      time = 0;
      activeId = null;
      resolved = false;
      contacts.clear();
      events.length = 0;
    },
    snapshot: () => ({
      events: events.map((e) => ({ ...e })),
      net: net
        ? {
            ...net,
            position: { ...net.position },
            velocity: { ...net.velocity },
          }
        : null,
    }),
  };
}
export type ShotFeedback = ReturnType<typeof createShotFeedback>;
