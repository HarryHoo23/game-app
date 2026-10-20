import { it, expect } from "vitest";
import { resolveTuningName } from "../src/tuning";
import { SessionLog } from "../src/debug/sessionLog";
import { config } from "../src/config";
import { mapGesture } from "../src/domain/launch";
import { shootingSpots } from "../src/domain/spots";
it("development tuning links cannot weaken production or change tuning on unknown names", () => {
  expect(resolveTuningName("?tuning=original", true)).toBe("original");
  expect(resolveTuningName("?tuning=moderate", true)).toBe("moderate");
  expect(resolveTuningName("?tuning=original", false)).toBe("power");
  expect(resolveTuningName("?tuning=moderate", false)).toBe("power");
  expect(resolveTuningName("?tuning=anything", true)).toBe("power");
  expect(resolveTuningName("", true)).toBe("power");
});
it("export identifies the actual shot preset, spot, gesture and mapped target in local coordinates", () => {
  const log = new SessionLog("human"),
    spot = shootingSpots[0];
  const gesture = {
    start: { x: 200, y: 620 },
    end: { x: 200, y: 463.36 },
    width: 400,
    height: 712,
    durationMs: 240,
  };
  log.recordLaunch({
    sessionId: 1,
    shotId: 1,
    gesture,
    launch: mapGesture(gesture, config, spot)!,
    origin: spot.origin,
    spot: { id: spot.id, index: 0, ballInSpot: 0, angle: 0 },
    viewBasis: spot.basis,
  });
  const data = JSON.parse(log.exportSession()),
    shot = data.shots[0];
  expect(data.version).toBe(3);
  expect(shot.tuning.preset).toBe("power");
  expect(shot.tuning.model).toBe("speed");
  expect(shot.spot.id).toBe("left-corner");
  expect(shot.gesture).toEqual(gesture);
  expect(shot.mappedTarget.depth).toBeGreaterThan(0.075);
  expect(shot.mappedTarget.screenRight).toBeCloseTo(0, 8);
  expect(shot.mappedTarget.position.x).toBeCloseTo(-shot.mappedTarget.depth, 8);
});
