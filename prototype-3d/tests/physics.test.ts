import { it, expect, beforeAll } from "vitest";
import { config } from "../src/config";
import { initPhysics, createTestWorld } from "./helpers/rapierWorld";
beforeAll(initPhysics);
it("hollow_ring_and_board_contacts", () => {
  for (const [x, z, kind] of [
    [0, 0, null],
    [0, 0.258, "rim"],
    [0, -0.258, "rim"],
    [0.258, 0, "rim"],
    [-0.258, 0, "rim"],
  ] as const) {
    const h = createTestWorld(config, { x, y: 3.8, z });
    h.ball.setLinvel({ x: 0, y: -2, z: 0 }, true);
    for (let i = 0; i < 60; i++) h.step();
    expect(h.contacts.some((c) => c.kind === "rim")).toBe(kind === "rim");
    expect(Number.isFinite(h.ball.linvel().y)).toBe(true);
    if (kind) expect(h.contacts[0].before.y).toBeLessThan(0);
    h.dispose();
  }
  const h = createTestWorld(config, { x: 0, y: 3.65, z: 0.5 });
  h.ball.setLinvel({ x: 0, y: 0, z: -4 }, true);
  for (let i = 0; i < 30; i++) h.step();
  expect(h.contacts.some((c) => c.kind === "board")).toBe(true);
  expect(h.ball.linvel().z).toBeGreaterThan(0);
  h.dispose();
});
