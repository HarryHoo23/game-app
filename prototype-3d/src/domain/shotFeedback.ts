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
    time = 0,
    entered = false,
    lastTouch = -Infinity;
  const pose = { stretch: 0, x: 0, z: 0, bulge: 0, depth: 0 };
  const speed = { stretch: 0, x: 0, z: 0, bulge: 0 };
  const touch = { stretch: 0, x: 0, z: 0, bulge: 0, depth: 0 };
  const passages: { shotId: number; at: number; position: Vec3 }[] = [];
  const contacts = new Map<string, number>();
  const events: { kind: SoundKind; shotId: number; at: number }[] = [];
  const play = (kind: SoundKind, shotId: number, strength = 1, at = time) => {
    events.push({ kind, shotId, at });
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
    get pose() {
      return pose;
    },
    step(now: number) {
      const dt = Math.min(1 / 60, Math.max(0, now - time));
      time = now;
      const reward = netPose(net, now, c),
        touching = now - lastTouch < 0.025;
      const targets = {
        stretch: Math.max(touching ? touch.stretch : 0, reward.stretch),
        x: (touching ? touch.x : 0) + reward.x * 0.45,
        z: (touching ? touch.z : 0) + reward.z * 0.45,
        bulge: touching ? touch.bulge : 0,
      };
      for (const key of ["stretch", "x", "z", "bulge"] as const) {
        speed[key] +=
          (1600 * (targets[key] - pose[key]) - 80 * speed[key]) * dt;
        pose[key] += speed[key] * dt;
        if (
          Math.abs(pose[key]) < 0.00015 &&
          Math.abs(speed[key]) < 0.003 &&
          Math.abs(targets[key]) < 0.0001
        )
          pose[key] = speed[key] = 0;
      }
      pose.depth = touch.depth;
    },
    passage(id: number, prev: Sample, next: Sample) {
      if (
        id !== activeId ||
        next.position.y >= prev.position.y ||
        next.velocity.y >= 0
      )
        return;
      const h = c.hoop.center,
        bottom = h.y - c.feedback.netHeight;
      const y = Math.max(bottom, Math.min(h.y, next.position.y));
      const depth = (h.y - y) / c.feedback.netHeight;
      const radius =
        (c.hoop.innerRadius + c.hoop.tubeRadius) * (1 - 0.44 * depth);
      const radial = Math.hypot(next.position.x - h.x, next.position.z - h.z);
      if (
        Math.hypot(next.position.y - y, Math.max(0, radial - radius)) >
        c.ball.radius
      )
        return;
      if (!entered) {
        entered = true;
        passages.push({ shotId: id, at: time, position: { ...next.position } });
        if (passages.length > 16) passages.shift();
        play("net", id, 0.38);
      }
      lastTouch = time;
      touch.stretch = 0.025 + depth * 0.065;
      touch.depth = depth;
      touch.bulge = 0.009 * (1 - depth * 0.3);
      touch.x = Math.max(
        -0.035,
        Math.min(
          0.035,
          (next.position.x - h.x) * 0.15 + next.velocity.x * 0.006,
        ),
      );
      touch.z = Math.max(
        -0.035,
        Math.min(
          0.035,
          (next.position.z - h.z) * 0.12 + next.velocity.z * 0.006,
        ),
      );
    },
    launch(id: number) {
      activeId = id;
      resolved = false;
      entered = false;
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
        now,
      );
    },
    reset() {
      net = null;
      time = 0;
      activeId = null;
      resolved = false;
      entered = false;
      contacts.clear();
      events.length = 0;
      passages.length = 0;
      lastTouch = -Infinity;
      for (const key of ["stretch", "x", "z", "bulge"] as const) {
        pose[key] = speed[key] = touch[key] = 0;
      }
      pose.depth = touch.depth = 0;
    },
    snapshot: () => ({
      events: events.map((e) => ({ ...e })),
      passages: passages.map((p) => ({ ...p, position: { ...p.position } })),
      pose: { ...pose },
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
