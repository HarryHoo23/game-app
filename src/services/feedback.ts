export class AudioService {
  enabled = false;
  private context?: AudioContext;
  play(kind: "rim" | "backboard" | "basket" | "swish" | "perfect") {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      void this.context.resume();
      const c = this.context;
      if (kind === "swish" || kind === "perfect") {
        const buffer = c.createBuffer(
          1,
          Math.floor(c.sampleRate * 0.18),
          c.sampleRate,
        );
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const noise = c.createBufferSource(),
          filter = c.createBiquadFilter(),
          gain = c.createGain();
        noise.buffer = buffer;
        filter.type = "bandpass";
        filter.frequency.value = 1800;
        filter.Q.value = 0.7;
        gain.gain.setValueAtTime(0.001, c.currentTime);
        gain.gain.linearRampToValueAtTime(0.045, c.currentTime + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(c.destination);
        noise.start();
        noise.onended = () => {
          noise.disconnect();
          filter.disconnect();
          gain.disconnect();
        };
        if (kind === "swish") return;
      }
      const impact = kind === "rim" || kind === "backboard";
      const o = c.createOscillator(),
        g = c.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(
        impact
          ? kind === "backboard"
            ? 95
            : 150
          : kind === "perfect"
            ? 740
            : 520,
        c.currentTime,
      );
      o.frequency.exponentialRampToValueAtTime(
        impact ? 80 : 1040,
        c.currentTime + 0.15,
      );
      g.gain.setValueAtTime(0.06, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.22);
      o.connect(g);
      g.connect(c.destination);
      o.start();
      o.stop(c.currentTime + 0.23);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
      };
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
