import { it, expect } from "vitest";
import {
  createPlayerProgress,
  BEST_KEY,
  TUTORIAL_KEY,
} from "../src/domain/playerProgress";

it("validates ten-ball best values and ignores old Endless scores", () => {
  for (const value of [
    "-1",
    "11",
    "Infinity",
    "NaN",
    "4.5",
    "1e1",
    "",
    "9007199254740993",
  ]) {
    expect(
      createPlayerProgress(() => ({
        getItem: () => value,
        setItem() {},
      })).readBest(),
    ).toBe(0);
  }
  for (const value of ["0", "5", "10"]) {
    expect(
      createPlayerProgress(() => ({
        getItem: () => value,
        setItem() {},
      })).readBest(),
    ).toBe(Number(value));
  }
});
it("best is monotonic, persists in a separate key and survives a fresh service", () => {
  const values = new Map([["afterhours3d-endless-best", "100"]]);
  const writes: string[] = [];
  const storage = {
    getItem: (k: string) => values.get(k) ?? null,
    setItem(k: string, v: string) {
      values.set(k, v);
      writes.push(k);
    },
  };
  const p = createPlayerProgress(() => storage);
  expect(p.readBest()).toBe(0);
  expect(p.recordBest(7)).toBe(7);
  for (const n of [0, 6, 7, 11, -1, 7.5, NaN]) expect(p.recordBest(n)).toBe(7);
  expect(writes).toEqual([BEST_KEY]);
  expect(createPlayerProgress(() => storage).readBest()).toBe(7);
});
it("denied reads, writes and absent storage keep best/tutorial in memory", () => {
  const denied = () => {
    throw new Error("denied");
  };
  for (const access of [
    denied,
    () => undefined,
    () => ({ getItem: denied, setItem: denied }),
  ]) {
    const p = createPlayerProgress(access);
    expect(p.hasLearnedSwipe()).toBe(false);
    expect(p.recordBest(6)).toBe(6);
    expect(p.readBest()).toBe(6);
    p.learnSwipe();
    expect(p.hasLearnedSwipe()).toBe(true);
  }
});
it("the one-time tutorial persists once", () => {
  const values = new Map<string, string>(),
    writes: string[] = [];
  const storage = {
    getItem: (k: string) => values.get(k) ?? null,
    setItem(k: string, v: string) {
      values.set(k, v);
      writes.push(k);
    },
  };
  const p = createPlayerProgress(() => storage);
  p.learnSwipe();
  p.learnSwipe();
  expect(writes).toEqual([TUTORIAL_KEY]);
  expect(createPlayerProgress(() => storage).hasLearnedSwipe()).toBe(true);
});
