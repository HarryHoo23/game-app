export type SoundKind = "release" | "rim" | "board" | "swish" | "make";
export const soundDuration: Record<SoundKind, number> = {
  release: 0.12,
  rim: 0.28,
  board: 0.22,
  swish: 0.26,
  make: 0.24,
};
/** Original, deterministic mono sounds. No network, sample license, or runtime oscillator pool. */
export function synthesizeSound(kind: SoundKind, rate: number): Float32Array {
  const out = new Float32Array(Math.ceil(soundDuration[kind] * rate));
  let seed = 17041,
    low = 0,
    previous = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / rate;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 2147483648 - 1;
    low += 0.16 * (noise - low);
    const high = noise - low,
      band = low - previous;
    previous = low;
    const tone = (hz: number) => Math.sin(2 * Math.PI * hz * t);
    let value = 0;
    if (kind === "release")
      value = (low * 0.6 + tone(145) * 0.08) * Math.exp(-t * 36);
    if (kind === "rim")
      value =
        0.34 * tone(640) * Math.exp(-t * 24) +
        0.18 * tone(1037) * Math.exp(-t * 35) +
        0.08 * tone(1730) * Math.exp(-t * 45) +
        high * 0.08 * Math.exp(-t * 150);
    if (kind === "board")
      value =
        (0.45 * tone(126) + 0.18 * tone(208) + low * 0.4) * Math.exp(-t * 32);
    if (kind === "swish")
      value =
        (band * 2.8 + high * 0.08) *
        Math.min(1, t / 0.018) *
        Math.exp(-t * 14) *
        (0.8 + 0.2 * Math.sin(t * 115));
    if (kind === "make")
      value =
        (0.22 * tone(740) + 0.12 * tone(1110)) *
        Math.min(1, t / 0.006) *
        Math.exp(-t * 23);
    const edge = Math.min(
      1,
      i / (rate * 0.002),
      (out.length - 1 - i) / (rate * 0.008),
    );
    out[i] = Math.max(-1, Math.min(1, value * edge));
  }
  return out;
}
