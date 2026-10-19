import { beforeAll, it, expect } from "vitest";
import { config as c } from "../src/config";
import { initPhysics } from "./helpers/rapierWorld";
import { simulateShot } from "./helpers/simulateShot";
beforeAll(initPhysics);
it("front rim, rear rim and board produce actual contacts and velocity responses", () => {
  for (const [z, kind] of [
    [0.22, "rim"],
    [-0.22, "rim"],
    [-0.8, "board"],
  ] as const) {
    const s = simulateShot({ ...c.hoop.center, z });
    expect(s.contacts.some((k) => k.kind === kind)).toBe(true);
    const hit = s.contacts.find((k) => k.kind === kind)!;
    if (kind === "rim") expect(Math.sign(hit.position.z)).toBe(Math.sign(z));
    expect(
      Math.hypot(
        hit.after.x - hit.before.x,
        hit.after.y - hit.before.y,
        hit.after.z - hit.before.z,
      ),
    ).toBeGreaterThan(0.1);
    expect(s.makes).toBeLessThanOrEqual(1);
    expect(s.result).toContain(kind === "rim" ? "rim" : "board");
  }
});
it("legitimate rim rebounds can still score", () => {
  const fixtures = Array.from({ length: 61 }, (_, i) => (i - 30) / 100).map(
    (z) => simulateShot({ ...c.hoop.center, z }),
  );
  const rimMake = fixtures.find((s) => s.result === "rim-make");
  expect(rimMake).toBeDefined();
  expect(rimMake!.makes).toBe(1);
});
