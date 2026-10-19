import { beforeAll, it, expect } from "vitest";
import { initPhysics, createTestWorld } from "./helpers/rapierWorld";
import { config as c } from "../src/config";
import { mapGesture } from "../src/domain/launch";
import { hasPhysicalContact } from "../src/domain/physicalContact";
beforeAll(initPhysics);
it("captures real rim impulses at positive speculative separation without inventing unforced contacts", () => {
  const h = createTestWorld(c),
    v = mapGesture(
      {
        start: { x: 200, y: 620 },
        end: { x: 200, y: 620 - 0.15 * 712 },
        width: 400,
        height: 712,
        durationMs: 200,
      },
      c,
    )!.velocity;
  h.ball.setLinvel(v, true);
  h.ball.setAngvel({ x: c.ball.backspin, y: 0, z: 0 }, true);
  let impulses = 0,
    detected = 0;
  for (let i = 0; i < 165; i++) {
    h.step();
    h.world.contactPairsWith(h.ball.collider(0), (other) =>
      h.world.contactPair(h.ball.collider(0), other, (m) => {
        for (let j = 0; j < m.numContacts(); j++)
          if (m.contactImpulse(j) > 0) impulses++;
        if (hasPhysicalContact(m)) detected++;
      }),
    );
  }
  expect(impulses).toBeGreaterThan(0);
  expect(detected).toBeGreaterThan(0);
  h.dispose();
  expect(
    hasPhysicalContact({
      numContacts: () => 1,
      contactImpulse: () => 0,
      numSolverContacts: () => 1,
      solverContactDist: () => 0.002,
    }),
  ).toBe(false);
});
