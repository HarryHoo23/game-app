import { it, expect } from "vitest";
import { SessionLog, copySession } from "../src/debug/sessionLog";
import { config as c } from "../src/config";
import { mapGesture } from "../src/domain/launch";
it("bounded_log contains actual launch, samples, contacts and outcome", () => {
  const log = new SessionLog("automation"),
    gesture = {
      start: { x: 200, y: 620 },
      end: { x: 200, y: 406.4 },
      width: 400,
      height: 712,
      durationMs: 240,
    },
    launch = mapGesture(gesture, c)!;
  for (let i = 1; i <= 101; i++) {
    log.recordLaunch({
      sessionId: 1,
      shotId: i,
      gesture,
      launch,
      origin: c.ball.origin,
    });
    for (let k = 0; k < 1000; k++)
      log.recordSample(i, {
        position: { x: 0, y: 3, z: 0 },
        velocity: launch.velocity,
        time: k / 120,
      });
    log.recordContact(i, {
      kind: "rim",
      time: 1,
      position: { x: 0, y: 3, z: 0.26 },
    });
    log.recordResult(i, "rim-make");
  }
  const data = JSON.parse(log.exportSession());
  expect(data.shots).toHaveLength(100);
  expect(data.shots[0].shotId).toBe(2);
  expect(data.shots[0].samples.length).toBeLessThanOrEqual(180);
  expect(data.shots[0].launch.velocity).toEqual(launch.velocity);
  expect(data.shots[0].contacts[0].kind).toBe("rim");
  expect(data.shots[0].result).toBe("rim-make");
  expect(data.source).toBe("automation");
});
it("clipboard_fallback offers the exact JSON for download", async () => {
  let downloaded = "";
  expect(
    await copySession(
      '{"shots":[]}',
      async () => {
        throw new Error("denied");
      },
      (s) => {
        downloaded = s;
      },
    ),
  ).toBe("downloaded");
  expect(downloaded).toBe('{"shots":[]}');
});
