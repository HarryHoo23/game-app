import { useEffect, type RefObject } from "react";
import { config } from "../config";
import { mapGesture, type Gesture, type Launch } from "../domain/launch";
import { createPointerGesture } from "./pointerGesture";
import type { ShotVisualDiagnostics } from "../domain/shotVisuals";
import type { ShotAudio } from "../audio/shotAudio";
export type ShotBridge = {
  ready: boolean;
  screen: { x: number; y: number; radius: number } | null;
  launch: ((launch: Launch, gesture: Gesture) => boolean) | null;
  aiming?: (active: boolean) => void;
  preview?: Launch | null;
  visuals?: ShotVisualDiagnostics | null;
};
export function useShotInput(
  element: RefObject<HTMLElement | null>,
  bridge: RefObject<ShotBridge>,
  sessionId: number,
  paused: boolean,
  audio: ShotAudio,
) {
  useEffect(() => {
    const el = element.current;
    if (!el) return;
    if (paused) {
      bridge.current.ready = false;
      bridge.current.preview = null;
      return;
    }
    const gesture = createPointerGesture(config);
    let pointer: number | null = null;
    const cancel = () => {
      gesture.cancel();
      bridge.current.preview = null;
      bridge.current.aiming?.(false);
      const id = pointer;
      pointer = null;
      if (id !== null && el.hasPointerCapture(id)) el.releasePointerCapture(id);
    };
    const down = (e: PointerEvent) => {
      if (
        !bridge.current.ready ||
        !e.isPrimary ||
        e.button !== 0 ||
        (e.target as HTMLElement).closest("button,a")
      )
        return;
      const r = el.getBoundingClientRect(),
        p = bridge.current.screen;
      if (!p) return;
      const x = e.clientX - r.left,
        y = e.clientY - r.top;
      if (Math.hypot(x - p.x, y - p.y) > Math.max(p.radius * 2, r.width * 0.16))
        return;
      if (
        gesture.begin({
          pointerId: e.pointerId,
          x,
          y,
          time: e.timeStamp,
          width: r.width,
          height: r.height,
          primary: e.isPrimary,
        })
      ) {
        pointer = e.pointerId;
        audio.unlock();
        bridge.current.preview = null;
        el.setPointerCapture(e.pointerId);
        bridge.current.aiming?.(true);
        e.preventDefault();
      }
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      const r = el.getBoundingClientRect(),
        g = gesture.move(
          e.pointerId,
          e.clientX - r.left,
          e.clientY - r.top,
          e.timeStamp,
        );
      if (
        g &&
        (Math.abs(g.width - r.width) >= 0.5 ||
          Math.abs(g.height - r.height) >= 0.5)
      ) {
        cancel();
        return;
      }
      bridge.current.preview = g ? mapGesture(g, config) : null;
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      const r = el.getBoundingClientRect(),
        g = gesture.end(
          e.pointerId,
          e.clientX - r.left,
          e.clientY - r.top,
          e.timeStamp,
        );
      pointer = null;
      bridge.current.preview = null;
      if (el.hasPointerCapture(e.pointerId))
        el.releasePointerCapture(e.pointerId);
      bridge.current.aiming?.(false);
      // ResizeObserver can run after pointerup; compare the release layout too.
      if (
        g &&
        Math.abs(g.width - r.width) < 0.5 &&
        Math.abs(g.height - r.height) < 0.5
      ) {
        const launch = mapGesture(g, config);
        if (launch) bridge.current.launch?.(launch, g);
      }
    };
    const lost = (e: PointerEvent) => {
      if (e.pointerId === pointer) cancel();
    };
    const hidden = () => {
      if (document.hidden) cancel();
    };
    const resize = new ResizeObserver(cancel);
    resize.observe(el);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", lost);
    el.addEventListener("lostpointercapture", lost);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      cancel();
      resize.disconnect();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", lost);
      el.removeEventListener("lostpointercapture", lost);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [element, bridge, sessionId, paused, audio]);
}
