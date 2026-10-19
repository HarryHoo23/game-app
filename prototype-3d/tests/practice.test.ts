import { it, expect, beforeEach } from "vitest";
import { usePracticeStore as store } from "../src/store";
import { createPracticeLifecycle } from "../src/domain/practice";
import { config as c } from "../src/config";
beforeEach(() => store.getState().restart());
it("practice_survives_30_attempts and one_result_per_shot", () => {
  const session = store.getState().sessionId;
  for (let i = 1; i <= 30; i++) {
    store.getState().recordReady(session);
    store.getState().recordLaunch(session, i);
    store.getState().recordResult(session, i, i % 2 ? "swish" : "short");
    store.getState().recordResult(session, i, "swish");
  }
  expect(store.getState().attempts).toBe(30);
  expect(store.getState().makes).toBe(15);
  store.getState().recordReady(session);
  expect(store.getState().phase).toBe("ready");
});
it("old_session_cannot_score after rapid restart", () => {
  const s = store.getState().sessionId;
  store.getState().recordLaunch(s, 1);
  store.getState().restart();
  store.getState().recordResult(s, 1, "swish");
  expect(store.getState().makes).toBe(0);
  expect(store.getState().attempts).toBe(0);
});
it("recovery_and_body_cap", () => {
  const r = createPracticeLifecycle(c);
  for (let i = 0; i < 30; i++) {
    const id = r.launch()!;
    expect(id).not.toBeNull();
    r.resolve(id, "swish");
    r.step(0.349);
    expect(r.readyId).toBeNull();
    r.step(0.002);
    expect(r.readyId).not.toBeNull();
    expect(r.balls.length).toBeLessThanOrEqual(3);
    expect(r.balls.some((b) => b.id === r.readyId)).toBe(true);
  }
  const id = r.launch()!;
  r.resolve(id, "short");
  r.step(0.149);
  expect(r.readyId).toBeNull();
  r.step(0.002);
  expect(r.readyId).not.toBeNull();
});
it("paused_time_is_not_caught_up and does not consume a new shot", () => {
  const r = createPracticeLifecycle(c);
  const id = r.launch()!;
  r.resolve(id, "swish");
  r.paused = true;
  r.step(30);
  expect(r.time).toBe(0);
  expect(r.readyId).toBeNull();
  r.paused = false;
  r.step(0.35);
  expect(r.readyId).not.toBeNull();
  store.getState().pause();
  store.getState().recordLaunch(store.getState().sessionId, 100);
  expect(store.getState().attempts).toBe(0);
  store.getState().resume();
  expect(store.getState().phase).toBe("ready");
});
