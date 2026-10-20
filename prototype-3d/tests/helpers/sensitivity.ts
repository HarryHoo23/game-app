import type { GameConfig } from "../../src/config";
import { mapGesture } from "../../src/domain/launch";
import type { ShootingSpot } from "../../src/domain/spots";
import type { Sample, Contact } from "../../src/domain/types";
import {
  createBasketState,
  advanceBasket,
  crossing,
} from "../../src/domain/scoring";
import { resolveShot, shouldRetire, isMake } from "../../src/domain/shot";
import { hasPhysicalContact } from "../../src/domain/physicalContact";
import { createTestWorld } from "./rapierWorld";

export function sensitivityShot(
  c: GameConfig,
  spot: ShootingSpot,
  up: number,
  dx: number,
) {
  const gesture = {
    start: { x: 200, y: 620 },
    end: { x: 200 + dx * 400, y: 620 - up * 712 },
    width: 400,
    height: 712,
    durationMs: 240,
  };
  const launch = mapGesture(gesture, c, spot)!;
  const reachable =
    launch.velocity.y ** 2 >= 2 * c.gravity * (c.hoop.center.y - spot.origin.y);
  const time = reachable
    ? (launch.velocity.y +
        Math.sqrt(
          launch.velocity.y ** 2 -
            2 * c.gravity * (c.hoop.center.y - spot.origin.y),
        )) /
      c.gravity
    : 0;
  const target = reachable
    ? {
        x: spot.origin.x + launch.velocity.x * time,
        y: c.hoop.center.y,
        z: spot.origin.z + launch.velocity.z * time,
      }
    : null;
  const offset = {
    x: (target?.x ?? c.hoop.center.x) - c.hoop.center.x,
    z: (target?.z ?? c.hoop.center.z) - c.hoop.center.z,
  };
  const mappedOffsets = reachable
    ? {
        right: offset.x * spot.basis.right.x + offset.z * spot.basis.right.z,
        depth: -(
          offset.x * spot.basis.forward.x +
          offset.z * spot.basis.forward.z
        ),
      }
    : null;
  const h = createTestWorld(c, spot.origin);
  h.ball.setLinvel(launch.velocity, true);
  h.ball.setAngvel(launch.angularVelocity, true);
  const trace: Sample[] = [
      { position: { ...spot.origin }, velocity: launch.velocity, time: 0 },
    ],
    contacts: Contact[] = [],
    crossings = [];
  let state = createBasketState(),
    handles = new Set<number>(),
    result = null,
    makes = 0;
  try {
    for (let i = 0; i < 600; i++) {
      const next = h.step(),
        prev = trace.at(-1)!,
        active = new Set<number>();
      // Match the live scene: classify actual solver contacts, not speculative pair events.
      h.world.contactPairsWith(h.ball.collider(0), (other) => {
        let touching = false;
        h.world.contactPair(h.ball.collider(0), other, (manifold) => {
          if (hasPhysicalContact(manifold)) touching = true;
        });
        if (!touching) return;
        active.add(other.handle);
        if (!handles.has(other.handle)) {
          const kind =
            other.shapeType() === 2
              ? "rim"
              : other.translation().y < 0
                ? "floor"
                : "board";
          contacts.push({
            kind,
            time: next.time,
            position: next.position,
            before: prev.velocity,
            after: next.velocity,
          });
        }
      });
      handles = active;
      trace.push(next);
      const at = crossing(prev, next, c.hoop.center.y);
      if (at)
        crossings.push({
          stage: "descending-rim",
          time: next.time,
          position: at,
          velocity: next.velocity,
        });
      const a = advanceBasket(
        state,
        prev,
        next,
        contacts.some((k) => k.kind === "floor"),
        c,
      );
      if (a.made) {
        makes++;
        crossings.push({
          stage: "lower-confirmed",
          time: next.time,
          position: next.position,
          velocity: next.velocity,
        });
      }
      state = a.state;
      if (
        result === null &&
        (a.made || shouldRetire(next, contacts, next.time, c))
      )
        result = resolveShot(trace, contacts, a.made, c, spot.basis);
      // Continue after the result to prove old rebounds cannot produce a second score.
      if (
        result !== null &&
        (next.time > 3 || contacts.some((k) => k.kind === "floor"))
      )
        break;
    }
    const outcome =
      result ?? resolveShot(trace, contacts, false, c, spot.basis);
    return {
      spot: spot.id,
      angle: spot.angle,
      up,
      dx,
      gesture,
      launch,
      target,
      mappedOffsets,
      result: outcome,
      made: isMake(outcome),
      downwardScoreEvents: makes,
      contacts,
      crossings,
      observedPeak: Math.max(
        ...trace
          .filter((s) => s.time <= (contacts[0]?.time ?? Infinity))
          .map((s) => s.position.y),
      ),
    };
  } finally {
    h.dispose();
  }
}
export const studyUp = Array.from({ length: 13 }, (_, i) =>
  Number((0.18 + i * 0.02).toFixed(2)),
);
export const studyDx = [
  -0.18, -0.12, -0.08, -0.05, -0.03, -0.018, -0.01, 0, 0.01, 0.018, 0.03, 0.05,
  0.08, 0.12, 0.18,
];
export function distribution(rows: ReturnType<typeof sensitivityShot>[]) {
  const outcomes = Object.fromEntries(
    [
      "swish",
      "rim-make",
      "board-make",
      "rim-miss",
      "board-miss",
      "short",
      "long",
      "left",
      "right",
      "miss",
    ].map((k) => [k, 0]),
  );
  for (const row of rows) outcomes[row.result]++;
  return {
    shots: rows.length,
    makes: rows.filter((r) => r.made).length,
    makeRate: rows.filter((r) => r.made).length / rows.length,
    cleanSwishRate: outcomes.swish / rows.length,
    outcomes,
  };
}
