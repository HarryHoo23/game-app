import { it, expect } from "vitest";
import {
  missVelocity,
  MissContact,
  postShotDepth,
} from "../domain/shooting/ImpactResponse";
import { resultTiming } from "../data/impactFeel";
const rim = { x: 200, y: 285 },
  point = { x: 200, y: 280 };
it("front and back rim contacts produce different outgoing physical velocities", () => {
  const v = { x: 0, y: 12 },
    front = missVelocity(v, "frontRim", point, rim),
    back = missVelocity(v, "backRim", point, rim);
  expect(front.y).toBeLessThan(0);
  expect(back.y).toBeGreaterThan(0);
  expect(front.x).not.toBe(back.x);
  expect(back).not.toEqual(v);
});
it("waits for visible rear-rim contact instead of sounding at distant arrival", () => {
  const m = new MissContact("backRim", rim);
  expect(m.advance(8, { x: 200, y: 220 }).resolve).toBe(false);
  expect(m.advance(40, { x: 200, y: 260 })).toMatchObject({
    contact: "backRim",
    resolve: true,
  });
  expect(m.advance(10, point).resolve).toBe(false);
});
it("waits for actual residual backboard contact before final miss resolution", () => {
  const m = new MissContact("airball", rim);
  expect(m.advance(8, { x: 304, y: 226 }).resolve).toBe(false);
  expect(m.collide("backboard")).toBe("backboard");
  expect(m.resolved).toBe(true);
  expect(m.collide("backboard")).toBeNull();
});
it("keeps a near-rim missed ball occluded until spatially clear", () => {
  expect(postShotDepth({ x: 200, y: 280 }, rim)).toBe("AT_RIM");
  expect(postShotDepth({ x: 200, y: 320 }, rim)).toBe("IN_NET");
  expect(postShotDepth({ x: 200, y: 414 }, rim)).toBe("BELOW_HOOP");
});
it("uses distinct bounded make/miss cadence", () => {
  expect(resultTiming.missReadyMs).toBeGreaterThanOrEqual(400);
  expect(resultTiming.missReadyMs).toBeLessThanOrEqual(550);
  expect(resultTiming.makeReadyMs).toBeGreaterThan(resultTiming.missReadyMs);
  expect(resultTiming.perfectReadyMs).toBeLessThanOrEqual(750);
});

it("does not time out a rear-rim approach before it can physically reach the contact plane", () => {
  const miss = new MissContact("backRim", rim);
  expect(miss.advance(90, { x: 200, y: 246 }).resolve).toBe(false);
  expect(miss.advance(35, { x: 200, y: 260 })).toMatchObject({
    contact: "backRim",
    resolve: true,
  });
});

it("retains rim/net occlusion until the whole visible sphere clears them", () => {
  expect(postShotDepth({ x: 200, y: 246 }, rim)).toBe("AT_RIM");
  expect(postShotDepth({ x: 200, y: 414 }, rim, 459)).toBe("IN_NET");
  expect(postShotDepth({ x: 200, y: 460 }, rim, 459)).toBe("BELOW_HOOP");
});

it("observes likely board approaches until contact or spatial clearance", () => {
  const miss = new MissContact("airball", rim);
  expect(miss.advance(90, { x: 290, y: 245 }).resolve).toBe(false);
  expect(miss.collide("backboard")).toBe("backboard");
  const clear = new MissContact("airball", rim);
  expect(clear.advance(20, { x: 340, y: 245 }).resolve).toBe(true);
});

it("waits for the solver instead of applying a height impulse after a swept handoff", () => {
  const miss = new MissContact(
    "frontRim",
    rim,
    { minX: 68.5, maxX: 331.5, maxY: 314 },
    true,
  );
  expect(miss.advance(8, { x: 252, y: 280 }).contact).toBeNull();
  expect(miss.collide("rim")).toBe("frontRim");
  expect(miss.collide("rim")).toBeNull();
});
it("includes actual side-frame thickness in the observation clearance", () => {
  const miss = new MissContact("airball", rim, {
    minX: 68.5,
    maxX: 331.5,
    maxY: 314,
  });
  expect(miss.advance(8, { x: 330, y: 255 }).resolve).toBe(false);
  expect(miss.advance(8, { x: 332, y: 255 }).resolve).toBe(true);
});
