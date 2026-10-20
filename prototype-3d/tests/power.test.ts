import { beforeAll, expect, it } from "vitest";
import { config as c } from "../src/config";
import { mapGesture } from "../src/domain/launch";
import { shootingSpots } from "../src/domain/spots";
import { initPhysics, createTestWorld } from "./helpers/rapierWorld";
import { sensitivityShot } from "./helpers/sensitivity";
import { SessionLog } from "../src/debug/sessionLog";
import { writePreviewPoints } from "../src/domain/shotVisuals";
import { launchTuningPresets } from "../src/tuning";
import { mkdirSync, writeFileSync } from "node:fs";
import { distribution } from "./helpers/sensitivity";

const gesture = (up: number, dx = 0) => ({
  start: { x: 200, y: 620 },
  end: { x: 200 + dx * 400, y: 620 - up * 712 },
  width: 400,
  height: 712,
  durationMs: 240,
});
beforeAll(initPhysics);

it("light shots can lack rim height; heavy shots have a visibly higher free-flight apex", () => {
  for (const spot of shootingSpots) {
    const heights = [0.06, 0.3, 0.5].map((up) => {
      const v = mapGesture(gesture(up), c, spot)!.velocity;
      return spot.origin.y + v.y ** 2 / (2 * c.gravity);
    });
    expect(heights[0]).toBeLessThan(c.hoop.center.y - c.ball.radius);
    expect(heights[1]).toBeCloseTo(4.1, 8);
    expect(heights[2]).toBeGreaterThan(4.9);
  }
});

it("power varies speed continuously without changing the neutral release angle", () => {
  const base = mapGesture(gesture(0.3), c)!.velocity;
  let previous = 0;
  for (let n = 6; n <= 70; n++) {
    const v = mapGesture(gesture(n / 100), c)!.velocity;
    expect(v.y).toBeGreaterThanOrEqual(previous);
    expect(v.y - previous || 0).toBeLessThan(n === 6 ? 10 : 0.5);
    expect(v.z / v.y).toBeCloseTo(base.z / base.y, 9);
    previous = v.y;
  }
  for (const boundary of [0.22, 0.3, 0.38]) {
    const a = mapGesture(gesture(boundary - 1e-6), c)!.velocity;
    const b = mapGesture(gesture(boundary + 1e-6), c)!.velocity;
    expect(Math.abs(a.y - b.y)).toBeLessThan(0.001);
  }
});

it("Rapier observes different peaks from one-time velocities and ordinary swipes still score at every spot", () => {
  for (const spot of shootingSpots) {
    const peaks = [0.06, 0.3, 0.5].map((up) => {
      const launch = mapGesture(gesture(up), c, spot)!;
      const h = createTestWorld(c, spot.origin);
      try {
        h.ball.setLinvel(launch.velocity, true);
        h.ball.setAngvel(launch.angularVelocity, true);
        let peak = spot.origin.y;
        for (let i = 0; i < 150; i++)
          peak = Math.max(peak, h.step().position.y);
        return peak;
      } finally {
        h.dispose();
      }
    });
    expect(peaks[0]).toBeLessThan(2.9);
    expect(peaks[1]).toBeCloseTo(4.1, 1);
    expect(peaks[2]).toBeGreaterThan(4.9);
    for (const up of [0.25, 0.3, 0.35]) {
      const row = sensitivityShot(c, spot, up, 0.01);
      expect(row.made, `${spot.id} up=${up}`).toBe(true);
      expect(row.downwardScoreEvents).toBe(1);
    }
  }
});

it("underpowered telemetry explicitly reports no rim-height target instead of invalid coordinates", () => {
  const log = new SessionLog("automation"),
    g = gesture(0.06);
  log.recordLaunch({
    sessionId: 1,
    shotId: 1,
    gesture: g,
    launch: mapGesture(g, c)!,
    origin: c.ball.origin,
  });
  const shot = JSON.parse(log.exportSession()).shots[0];
  expect(shot.mappedTarget).toBeNull();
  expect(shot.freeFlight.apex).toBeLessThan(2.9);
  expect(shot.launch.intent.powerScale).toBeLessThan(0.75);
});

it("the full Practice preview shows an underpowered ball falling instead of stopping at its apex", () => {
  const velocity = mapGesture(gesture(0.06), c)!.velocity;
  const points = new Float32Array(108);
  const preview = writePreviewPoints(velocity, c, points);
  expect(preview.count).toBe(36);
  expect(points[106]).toBeCloseTo(c.ball.radius, 5);
  expect(
    Math.max(...Array.from({ length: 36 }, (_, i) => points[i * 3 + 1])),
  ).toBeLessThan(2.9);
});

it("an observed low arc is reported as short at all spots, while heavy shots can overshoot", () => {
  for (const spot of shootingSpots) {
    expect(sensitivityShot(c, spot, 0.06, 0).result).toBe("short");
    expect(sensitivityShot(c, spot, 0.5, 0).made).toBe(false);
  }
});

if (process.env.POWER_STUDY)
  it("records paired actual-Rapier power and historical target models", () => {
    const presets = ["moderate", "power"] as const;
    const vertical = [
      0.06, 0.1, 0.14, 0.18, 0.2, 0.22, 0.25, 0.28, 0.3, 0.32, 0.35, 0.38, 0.4,
      0.42, 0.46, 0.5, 0.55, 0.6,
    ];
    const horizontal = [-0.1, -0.03, 0, 0.03, 0.1];
    const reports = presets.map((preset) => {
      const cfg = {
        ...c,
        launch: { ...c.launch, ...launchTuningPresets[preset] },
      };
      const rows = shootingSpots.flatMap((spot) =>
        vertical.flatMap((up) =>
          horizontal.map((dx) => sensitivityShot(cfg, spot, up, dx)),
        ),
      );
      for (const row of rows)
        expect(row.downwardScoreEvents).toBe(Number(row.made));
      return {
        preset,
        config: cfg,
        all: distribution(rows),
        perSpot: shootingSpots.map((spot) => ({
          spot: spot.id,
          ...distribution(rows.filter((r) => r.spot === spot.id)),
        })),
        rows,
      };
    });
    mkdirSync("docs/verification/power-2026-10-20", { recursive: true });
    writeFileSync(
      "docs/verification/power-2026-10-20/physics.json",
      JSON.stringify(
        {
          note: "Equal-weight deterministic gesture probes, not human success rates. Fresh identical Rapier worlds; one-time launch velocities; existing downward scoring.",
          vertical,
          horizontal,
          reports,
        },
        null,
        2,
      ),
    );
    console.log(
      reports.map((r) => ({
        preset: r.preset,
        all: r.all,
        contacts: r.rows
          .filter((x) => x.contacts.some((k) => k.kind === "board"))
          .map((x) => ({ spot: x.spot, up: x.up, dx: x.dx, result: x.result }))
          .slice(0, 15),
      })),
    );
  }, 120000);
