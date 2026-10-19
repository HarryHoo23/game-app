import { config as c } from "../../src/config";
import type { Vec3, Sample } from "../../src/domain/types";
import { solveBallistic } from "../../src/domain/launch";
import { advanceBasket, createBasketState } from "../../src/domain/scoring";
import { resolveShot, shouldRetire } from "../../src/domain/shot";
import { createTestWorld } from "./rapierWorld";
export function simulateShot(target: Vec3, velocity?: Vec3) {
  const h = createTestWorld(c),
    v =
      velocity ??
      solveBallistic(c.ball.origin, target, c.launch.apex, c.gravity);
  h.ball.setLinvel(v, true);
  let prev: Sample = {
      position: { ...c.ball.origin },
      velocity: { ...v },
      time: 0,
    },
    state = createBasketState(),
    makes = 0;
  const trace: Sample[] = [prev];
  for (let i = 0; i < 600; i++) {
    const next = h.step();
    trace.push(next);
    const a = advanceBasket(
      state,
      prev,
      next,
      h.contacts.some((k) => k.kind === "floor"),
      c,
    );
    state = a.state;
    makes += Number(a.made);
    prev = next;
    if (a.made || shouldRetire(next, h.contacts, next.time, c)) break;
  }
  const contacts = [...h.contacts],
    result = resolveShot(trace, contacts, makes > 0, c);
  h.dispose();
  return { trace, contacts, result, makes, velocity: v };
}
