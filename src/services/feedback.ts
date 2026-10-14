export class AudioService {
  enabled = false;
  private context?: AudioContext;
  play(kind: "rim" | "basket" | "perfect") {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      void this.context.resume();
      const c = this.context,
        o = c.createOscillator(),
        g = c.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(
        kind === "rim" ? 150 : kind === "perfect" ? 740 : 520,
        c.currentTime,
      );
      o.frequency.exponentialRampToValueAtTime(
        kind === "rim" ? 80 : 1040,
        c.currentTime + 0.15,
      );
      g.gain.setValueAtTime(0.06, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.22);
      o.connect(g);
      g.connect(c.destination);
      o.start();
      o.stop(c.currentTime + 0.23);
    } catch {
      /* Optional audio never interrupts a shot. */
    }
  }
}
export interface HapticsService {
  pulse(kind: "rim" | "basket" | "perfect"): void;
}
export class BrowserHaptics implements HapticsService {
  pulse(_kind: "rim" | "basket" | "perfect") {
    void _kind; /* Native haptics can replace this adapter later. */
  }
}
