import { it, expect, describe } from "vitest";
import { HoopSensors } from "../game/hoop/HoopSensors";
import { hoopLayout } from "../game/hoop/hoopLayout";
const make = () => new HoopSensors({ x: 200, y: 285 }, 32);
describe("ordered swept hoop sensors", () => {
  it("requires top, centre and exit, awarding only once at the exit", () => {
    const s = make();
    expect(s.sample({ x: 200, y: 245 }, { x: 200, y: 270 })).toMatchObject({
      scored: false,
      stage: "AT_RIM",
    });
    expect(s.sample({ x: 200, y: 270 }, { x: 200, y: 300 })).toMatchObject({
      scored: false,
      stage: "IN_NET",
      entered: true,
    });
    expect(
      s.sample(
        { x: 200, y: 300 },
        { x: 200, y: 285 + hoopLayout.sensors.exit + 1 },
      ),
    ).toMatchObject({ scored: true, stage: "BELOW_HOOP" });
    expect(s.sample({ x: 200, y: 245 }, { x: 200, y: 430 }).scored).toBe(false);
  });
  it("handles a fast downward passage in one sample", () =>
    expect(make().sample({ x: 200, y: 240 }, { x: 200, y: 430 }).scored).toBe(
      true,
    ));
  it.each([
    [
      { x: 200, y: 430 },
      { x: 200, y: 245 },
    ],
    [
      { x: 200, y: 280 },
      { x: 200, y: 430 },
    ],
    [
      { x: 250, y: 245 },
      { x: 200, y: 430 },
    ],
    [
      { x: 240, y: 245 },
      { x: 240, y: 430 },
    ],
  ])("rejects upward entry, underside overlap and side entry", (a, b) =>
    expect(make().sample(a, b).scored).toBe(false),
  );
  it("invalidates a path that reverses or leaves the aperture", () => {
    const s = make();
    s.sample({ x: 200, y: 240 }, { x: 200, y: 270 });
    s.sample({ x: 200, y: 270 }, { x: 200, y: 260 });
    expect(s.sample({ x: 200, y: 260 }, { x: 200, y: 430 }).scored).toBe(false);
    const side = make();
    side.sample({ x: 200, y: 240 }, { x: 200, y: 270 });
    side.sample({ x: 200, y: 270 }, { x: 245, y: 300 });
    expect(side.sample({ x: 245, y: 300 }, { x: 200, y: 430 }).scored).toBe(
      false,
    );
  });
  it("tracks rim and backboard contact independently of overlap", () => {
    const s = make();
    s.touch("rim");
    s.touch("backboard");
    s.sample({ x: 200, y: 240 }, { x: 200, y: 430 });
    expect(s.contacts).toEqual({ rim: true, backboard: true });
    s.reset();
    expect(s.contacts).toEqual({ rim: false, backboard: false });
  });
});

it("continues smoothly from the above-rim arrival, scoring after visible net exit", async () => {
  const { HoopPass } = await import("../game/hoop/HoopPass");
  const { createShot, assessShot, sampleShot } =
    await import("../domain/shooting/ShotTrajectory");
  const { calculateStats, initialProgress } =
    await import("../domain/progression/progress");
  const { levels } = await import("../data/levels");
  const stats = calculateStats(initialProgress()),
    l = levels[0],
    p = createShot(0, -146, l, stats)!,
    r = assessShot(p, l, stats);
  expect(p.target.y).toBeLessThan(l.hoopY + hoopLayout.sensors.top);
  const pass = new HoopPass(l);
  pass.start(p, r);
  expect(pass.pose).toEqual(sampleShot(p, 1));
  let entered = false,
    scored = false,
    previous = pass.pose!;
  for (let i = 0; i < 60; i++) {
    const event = pass.advance(1000 / 120);
    if (!event.pose) break;
    expect(event.pose.y).toBeGreaterThanOrEqual(previous.y);
    expect(Math.abs(event.pose.y - previous.y)).toBeLessThan(12);
    expect(event.pose.rotation).toBeLessThanOrEqual(previous.rotation);
    expect(event.pose.scale).toBeLessThanOrEqual(previous.scale);
    if (event.entered) entered = true;
    if (event.scored) {
      scored = true;
      expect(entered).toBe(true);
      expect(event.pose.y).toBeGreaterThanOrEqual(
        l.hoopY + hoopLayout.sensors.exit,
      );
      break;
    }
    previous = event.pose;
  }
  expect(scored).toBe(true);
  expect(pass.advance(100).scored).toBe(false);
});

it.each([
  [0, -140],
  [0, -135],
  [11, -146],
])(
  "preserves accepted swish and rim makes through all sensors (%s,%s)",
  async (dx, dy) => {
    const { HoopPass } = await import("../game/hoop/HoopPass");
    const { createShot, assessShot } =
      await import("../domain/shooting/ShotTrajectory");
    const { calculateStats, initialProgress } =
      await import("../domain/progression/progress");
    const { levels } = await import("../data/levels");
    const stats = calculateStats(initialProgress()),
      level = levels[0],
      plan = createShot(dx, dy, level, stats)!,
      result = assessShot(plan, level, stats),
      pass = new HoopPass(level);
    expect(result.made).toBe(true);
    pass.start(plan, result);
    let scored = false;
    while (pass.active) scored = pass.advance(1000 / 60).scored || scored;
    expect(scored).toBe(true);
  },
);

it("accelerates continuously into a fast centre-to-exit passage", async () => {
  const { HoopPass } = await import("../game/hoop/HoopPass");
  const { createShot, assessShot, sampleShot } =
    await import("../domain/shooting/ShotTrajectory");
  const { calculateStats, initialProgress } =
    await import("../domain/progression/progress");
  const { levels } = await import("../data/levels");
  const stats = calculateStats(initialProgress()),
    level = levels[0];
  const plan = createShot(0, -146, level, stats)!,
    pass = new HoopPass(level);
  pass.start(plan, assessShot(plan, level, stats));
  const arrival = sampleShot(plan, 1);
  expect(pass.pose).toEqual(arrival);
  const first = pass.advance(0.0001).pose!;
  expect(first.velocity.y).toBeCloseTo(arrival.velocity.y, 3);
  expect(((first.y - arrival.y) / 0.0001) * (1000 / 60)).toBeCloseTo(
    arrival.velocity.y,
    3,
  );
  let centerMs = 0,
    exitMs = 0;
  while (pass.active) {
    const event = pass.advance(1);
    if (event.entered) centerMs = pass.elapsedMs;
    if (event.scored) exitMs = pass.elapsedMs;
  }
  expect(centerMs).toBeGreaterThanOrEqual(20);
  expect(centerMs).toBeLessThanOrEqual(40);
  expect(exitMs - centerMs).toBeGreaterThanOrEqual(100);
  expect(exitMs - centerMs).toBeLessThanOrEqual(170);
  expect(exitMs).toBeLessThanOrEqual(200);
});
