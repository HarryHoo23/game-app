import { it, expect } from "vitest";
import { config as c } from "../src/config";
import { advanceBasket, createBasketState } from "../src/domain/scoring";
import type { Sample } from "../src/domain/types";
const sample = (y: number, x = 0, z = 0): Sample => ({
  position: { x, y, z },
  velocity: { x: 0, y: -3, z: -1 },
  time: 0,
});
it("ordered_downward_score_once even across multiple planes in one step", () => {
  const a = advanceBasket(
    createBasketState(),
    sample(3.5),
    sample(2.8),
    false,
    c,
  );
  expect(a.made).toBe(true);
  expect(advanceBasket(a.state, sample(3.5), sample(2.8), false, c).made).toBe(
    false,
  );
});
it("reject_upward_side_floor_and_repeat", () => {
  const s = createBasketState();
  expect(advanceBasket(s, sample(2.8), sample(3.5), false, c).made).toBe(false);
  expect(
    advanceBasket(s, sample(3.5, 0.4), sample(2.8, 0.4), false, c).made,
  ).toBe(false);
  expect(advanceBasket(s, sample(2.95, 0.4), sample(2.8), false, c).made).toBe(
    false,
  );
  expect(advanceBasket(s, sample(3.5), sample(2.8), true, c).made).toBe(false);
  const grounded = advanceBasket(s, sample(1), sample(0.12), true, c).state;
  expect(advanceBasket(grounded, sample(3.5), sample(2.8), false, c).made).toBe(
    false,
  );
});
it("accept_slanted_lower_exit without requiring the ball to stay centred below the rim", () => {
  let s = advanceBasket(
    createBasketState(),
    sample(3.4, 0, 0.12),
    sample(3.04, 0, -0.02),
    false,
    c,
  ).state;
  const a = advanceBasket(
    s,
    sample(3.04, 0, -0.02),
    sample(2.85, 0, -0.19),
    false,
    c,
  );
  expect(a.made).toBe(true);
  s = advanceBasket(
    createBasketState(),
    sample(3.4),
    sample(3.02),
    false,
    c,
  ).state;
  s = advanceBasket(s, sample(3.02), sample(3.04), false, c).state;
  expect(advanceBasket(s, sample(3.04), sample(2.8), false, c).made).toBe(
    false,
  );
});
