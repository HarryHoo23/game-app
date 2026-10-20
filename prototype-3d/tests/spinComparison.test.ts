import { beforeAll, it, expect } from "vitest";
import { writeFileSync } from "node:fs";
import { initPhysics, createTestWorld } from "./helpers/rapierWorld";
import { config as c } from "../src/config";
import { shootingSpots } from "../src/domain/spots";
import { mapGesture } from "../src/domain/launch";
beforeAll(initPhysics);
it("rotated spin preserves the frontal sign and records physical rim/board rebound differences at all five spots", () => {
  const rows = [];
  const boardDx = [-0.3, -0.4, -0.4, -0.1, 0.2];
  for (const [index, spot] of shootingSpots.entries()) {
    for (const kind of ["rim", "board"] as const) {
      const up = kind === "rim" ? 0.15 : 0.55,
        dx = kind === "rim" ? 0 : boardDx[index];
      const launch = mapGesture(
        {
          start: { x: 200, y: 620 },
          end: { x: 200 + dx * 400, y: 620 - up * 712 },
          width: 400,
          height: 712,
          durationMs: 240,
        },
        c,
        spot,
      )!;
      const samples = [];
      for (const spin of [{ x: -7, y: 0, z: 0 }, launch.angularVelocity]) {
        const h = createTestWorld(c, spot.origin);
        h.ball.setLinvel(launch.velocity, true);
        h.ball.setAngvel(spin, true);
        let contactAt = 0,
          after = h.step();
        for (let n = 1; n < 480; n++) {
          after = h.step();
          if (!contactAt)
            contactAt = h.contacts.find((k) => k.kind === kind)?.time ?? 0;
          if (contactAt && after.time >= contactAt + 0.25) break;
        }
        expect(contactAt, `${spot.id} ${kind}`).toBeGreaterThan(0);
        expect(Object.values(after.position).every(Number.isFinite)).toBe(true);
        samples.push({
          contact: h.contacts.find((k) => k.kind === kind),
          afterQuarterSecond: after,
        });
        h.dispose();
      }
      const a = samples[0].afterQuarterSecond.position,
        b = samples[1].afterQuarterSecond.position;
      const differenceMetres = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      if (spot.angle === 90 && kind === "rim") expect(differenceMetres).toBe(0);
      if (spot.angle !== 90 && kind === "rim")
        expect(differenceMetres).toBeGreaterThan(0.001);
      rows.push({
        spot: spot.id,
        fixture: { kind, up, dx },
        launch,
        legacyFixedX: samples[0],
        oriented: samples[1],
        differenceMetres,
      });
    }
  }
  if (process.env.RECORD_SPIN)
    writeFileSync(
      "docs/verification/five-spot-2026-10-20/spin-comparison.json",
      JSON.stringify(
        {
          note: "Legacy -7 sign retained. Same launch velocity, only axis orientation differs. Positions sampled 0.25 s after first matching real collision.",
          rows,
        },
        null,
        2,
      ),
    );
});
