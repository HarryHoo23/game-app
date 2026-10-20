import { beforeAll, it, expect } from "vitest";
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { config } from "../src/config";
import { shootingSpots } from "../src/domain/spots";
import { initPhysics } from "./helpers/rapierWorld";
import {
  sensitivityShot,
  studyUp,
  studyDx,
  distribution,
} from "./helpers/sensitivity";
beforeAll(initPhysics);
it("a real physical swish scores exactly once in the sensitivity harness", () => {
  const row = sensitivityShot(config, shootingSpots[0], 0.3, 0);
  expect(row.result).toBe("swish");
  expect(row.downwardScoreEvents).toBe(1);
  expect(
    row.crossings.find((x) => x.stage === "lower-confirmed")!.velocity.y,
  ).toBeLessThan(0);
  expect(row.mappedOffsets.right).toBeCloseTo(0);
  expect(row.mappedOffsets.depth).toBeCloseTo(0);
});
if (process.env.CALIBRATION_STUDY)
  it("reproducible paired five-spot sensitivity study using live scoring and real contacts", () => {
    const preset = process.env.CALIBRATION_STUDY!;
    const c = structuredClone(config);
    c.launch.softBand = preset.startsWith("moderate") ? 0.08 : 0.1;
    c.launch.softDepth = preset.startsWith("moderate") ? 0.075 : 0.06;
    c.hoop.innerRadius = preset.endsWith("small-rim") ? 0.229 : 0.232;
    const rows = shootingSpots.flatMap((spot) =>
      studyUp.flatMap((up) =>
        studyDx.map((dx) => sensitivityShot(c, spot, up, dx)),
      ),
    );
    for (const row of rows) {
      expect(row.downwardScoreEvents).toBe(Number(row.made));
      expect(
        row.crossings
          .filter((x) => x.stage === "lower-confirmed")
          .every((x) => x.velocity.y < 0),
      ).toBe(true);
    }
    const perSpot = shootingSpots.map((spot) => ({
      spot: spot.id,
      broad: distribution(rows.filter((r) => r.spot === spot.id)),
      core: distribution(
        rows.filter(
          (r) =>
            r.spot === spot.id &&
            r.up >= 0.22 &&
            r.up <= 0.38 &&
            Math.abs(r.dx) <= 0.05,
        ),
      ),
    }));
    const report = {
      startingHead: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      preset,
      config: c,
      sampling: {
        vertical: studyUp,
        horizontal: studyDx,
        durationMs: 240,
        viewport: [400, 712],
        equalWeight: true,
        broad: "up .18–.42, dx ±.18 incl. dead-zone samples",
        core: "up .22–.38 and abs(dx) <= .05",
        disclaimer:
          "A deterministic sensitivity grid, not a human gesture distribution or human success rate.",
      },
      all: distribution(rows),
      perSpot,
      edgeProbes: shootingSpots.flatMap((spot) =>
        [
          [0.08, 0],
          [0.1, 0],
          [0.14, 0],
          [0.46, 0],
          [0.5, 0],
          [0.55, 0],
          [0.3, -0.22],
          [0.3, 0.22],
          [0.3, -0.3],
          [0.3, 0.3],
        ].map(([up, dx]) => sensitivityShot(c, spot, up, dx)),
      ),
      rows,
    };
    writeFileSync(
      `docs/verification/calibration-2026-10-20/${preset}.json`,
      JSON.stringify(report, null, 2),
    );
    console.log(preset, JSON.stringify(perSpot));
  }, 120000);
