import { expect, it, vi } from "vitest";
import { createShotFeedback, netPose } from "../src/domain/shotFeedback";
import { synthesizeSound } from "../src/audio/synthesis";
import { config as c } from "../src/config";
import type { Sample } from "../src/domain/types";

const sample: Sample = {
  position: { x: 0.08, y: 2.89, z: 0 },
  velocity: { x: 0.4, y: -4, z: -2 },
  time: 1.2,
};
it("routes actual release/contact/result events once, rejecting quiet contact chatter and misses", () => {
  const audio = { play: vi.fn() },
    f = createShotFeedback(audio);
  f.launch(1);
  const contact = {
    kind: "rim" as const,
    time: 1,
    position: sample.position,
    before: { x: 0, y: -3, z: -2 },
    after: { x: 0, y: 2, z: 1 },
  };
  f.contact(1, contact);
  f.contact(1, { ...contact, time: 1.01 });
  f.contact(1, { ...contact, kind: "board", time: 1.03 });
  f.result(1, "rim-make", sample, 2);
  f.result(1, "rim-make", sample, 2.01);
  expect(audio.play.mock.calls.map((a) => a[0])).toEqual([
    "release",
    "rim",
    "board",
    "make",
  ]);
  expect(f.net?.result).toBe("rim-make");
  expect(f.net?.at).toBe(2);
  f.launch(2);
  f.result(2, "rim-miss", sample, 3);
  expect(audio.play.mock.calls.filter((a) => a[0] === "make")).toHaveLength(1);
  f.launch(3);
  f.result(3, "swish", sample, 4);
  expect(audio.play.mock.calls.at(-1)?.[0]).toBe("swish");
  f.reset();
  expect(f.net).toBeNull();
  expect(f.snapshot().events).toEqual([]);
});
it("net is anchored, directional, strongest for a swish and fully settles in 280ms", () => {
  const swish = {
    result: "swish" as const,
    at: 1,
    position: sample.position,
    velocity: sample.velocity,
  };
  expect(netPose(swish, 1, c).stretch).toBe(0);
  const peak = netPose(swish, 1.075, c),
    rim = netPose({ ...swish, result: "rim-make" }, 1.075, c);
  expect(peak.stretch).toBeGreaterThan(0.2);
  expect(peak.stretch).toBeGreaterThan(rim.stretch);
  expect(peak.x).toBeGreaterThan(0);
  expect(peak.z).toBeLessThan(0);
  expect(netPose(swish, 1.28, c)).toEqual({ stretch: 0, x: 0, z: 0 });
  expect(netPose(null, 2, c)).toEqual({ stretch: 0, x: 0, z: 0 });
});
it("procedural sounds are bounded, finite, deterministic, and rim differs from glass", () => {
  const sounds = ["release", "rim", "board", "swish", "make"] as const;
  const samples = sounds.map((k) => synthesizeSound(k, 24000));
  for (const s of samples) {
    expect(s.length).toBeGreaterThan(1000);
    expect(s.length).toBeLessThan(12000);
    expect(s.every(Number.isFinite)).toBe(true);
    expect(Math.max(...s.map(Math.abs))).toBeLessThanOrEqual(1);
    expect(s.reduce((sum, a) => sum + a * a, 0) / s.length).toBeGreaterThan(
      0.0001,
    );
  }
  expect(samples[1]).not.toEqual(samples[2]);
  expect(synthesizeSound("swish", 24000)).toEqual(samples[3]);
});
