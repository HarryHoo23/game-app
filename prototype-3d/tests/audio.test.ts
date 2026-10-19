import { expect, it, vi } from "vitest";
import { createShotAudio } from "../src/audio/shotAudio";

it("creates no context before gesture unlock, caps voices, stops them and never queues muted playback", () => {
  const sources: {
    stop: ReturnType<typeof vi.fn>;
    onended: (() => void) | null;
  }[] = [];
  const context = {
    state: "running",
    sampleRate: 24000,
    destination: {},
    createGain: () => ({
      gain: { value: 0 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    createBuffer: (_n: number, size: number) => ({
      getChannelData: () => new Float32Array(size),
    }),
    createBufferSource: () => {
      const s = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      };
      sources.push(s);
      return s;
    },
    close: vi.fn(async () => {}),
    resume: vi.fn(async () => {}),
  };
  const factory = vi.fn(() => context as unknown as AudioContext),
    audio = createShotAudio(factory);
  expect(audio.play("release")).toBe(false);
  expect(factory).not.toHaveBeenCalled();
  audio.unlock();
  expect(factory).toHaveBeenCalledTimes(1);
  for (let i = 0; i < 12; i++) audio.play("rim");
  expect(audio.snapshot().voices).toBe(8);
  audio.setPaused(true);
  expect(sources.every((s) => s.stop.mock.calls.length === 1)).toBe(true);
  expect(audio.snapshot().voices).toBe(0);
  expect(audio.play("swish")).toBe(false);
  audio.setPaused(false);
  expect(audio.snapshot().played).toBe(8);
  audio.play("swish");
  expect(audio.snapshot().played).toBe(9);
  audio.dispose();
  expect(context.close).toHaveBeenCalledTimes(1);
});
it("denied audio initialization does not escape into gameplay", () => {
  const audio = createShotAudio(() => {
    throw new Error("Unavailable");
  });
  expect(() => audio.unlock()).not.toThrow();
  expect(audio.play("release")).toBe(false);
  expect(() => audio.dispose()).not.toThrow();
});
