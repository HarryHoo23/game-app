import { afterEach, describe, expect, it, vi } from "vitest";
import {
  recordInputRelease,
  finishInputImpact,
  finalizeInputShot,
} from "../game/input/inputDebug";
import { createShot, assessShot } from "../domain/shooting/ShotTrajectory";
import { levels } from "../data/levels";
import {
  calculateStats,
  initialProgress,
} from "../domain/progression/progress";

const level = levels[0],
  stats = calculateStats(initialProgress());
const start = { x: 192, y: 674 },
  end = { x: 207, y: 528 };
interface DebugWindow {
  location: { search: string };
  __inputDebug?: {
    shots: Array<Record<string, unknown>>;
    clear: () => void;
  };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("development gesture telemetry", () => {
  it("is absent without the query flag and outside development", () => {
    const win: DebugWindow = { location: { search: "" } };
    vi.stubGlobal("window", win);
    const plan = createShot(15, -146, level, stats)!;
    recordInputRelease(start, end, plan, level, stats);
    expect(win.__inputDebug).toBeUndefined();
    win.location.search = "?debugInput";
    vi.stubEnv("DEV", false);
    recordInputRelease(start, end, plan, level, stats);
    expect(win.__inputDebug).toBeUndefined();
  });

  it("retains 25 gestures, links final score by plan identity and records actual impact", () => {
    const win: DebugWindow = { location: { search: "?debugInput" } };
    vi.stubGlobal("window", win);
    vi.spyOn(console, "table").mockImplementation(() => {});
    const plans = Array.from({ length: 30 }, () =>
      createShot(15, -146, level, stats)!,
    );
    plans.forEach((plan) => recordInputRelease(start, end, plan, level, stats));
    const api = win.__inputDebug!;
    expect(api.shots).toHaveLength(25);
    expect(api.shots[24]).toMatchObject({
      rawStartX: 192,
      rawStartY: 674,
      rawEndX: 207,
      rawEndY: 528,
      rawDx: 15,
      rawDy: -146,
      verticalDrag: 146,
      mappedPower: plans[29].power,
      targetX: plans[29].target.x,
      targetY: plans[29].target.y,
      finalScore: null,
    });
    finishInputImpact(plans[29], "frontRim");
    const result = assessShot(plans[29], level, stats);
    finalizeInputShot(plans[29], result);
    expect(api.shots[24]).toMatchObject({
      finalImpact: "frontRim",
      finalScore: result.score,
    });
    expect(api.shots[23].finalScore).toBeNull();
    api.clear();
    expect(api.shots).toHaveLength(0);
  });
});
