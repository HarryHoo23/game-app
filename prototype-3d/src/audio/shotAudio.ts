import { config } from "../config";
import { synthesizeSound, type SoundKind } from "./synthesis";
/** One lazily unlocked context; at most eight short voices, with no queued autoplay. */
export function createShotAudio(
  factory: () => AudioContext = () => new AudioContext(),
) {
  let context: AudioContext | null = null,
    master: GainNode | null = null;
  let paused = false,
    played = 0;
  const buffers = new Map<SoundKind, AudioBuffer>(),
    voices = new Set<AudioBufferSourceNode>();
  const stop = () => {
    for (const source of voices) source.stop();
    voices.clear();
  };
  return {
    unlock() {
      if (paused) return;
      try {
        if (!context || context.state === "closed") {
          context = factory();
          master = context.createGain();
          master.gain.value = config.feedback.audioGain;
          master.connect(context.destination);
          buffers.clear();
        }
        if (context.state === "suspended")
          void context.resume().catch(() => {});
      } catch {
        /* Audio is optional; unsupported/denied playback must not interrupt play. */
      }
    },
    play(kind: SoundKind, strength = 1) {
      if (paused || !context || context.state !== "running" || !master)
        return false;
      if (voices.size >= 8) return false;
      try {
        let buffer = buffers.get(kind);
        if (!buffer) {
          const samples = synthesizeSound(kind, context.sampleRate);
          buffer = context.createBuffer(1, samples.length, context.sampleRate);
          buffer.getChannelData(0).set(samples);
          buffers.set(kind, buffer);
        }
        const source = context.createBufferSource(),
          gain = context.createGain();
        source.buffer = buffer;
        gain.gain.value = Math.max(0.05, Math.min(1, strength));
        source.connect(gain);
        gain.connect(master);
        voices.add(source);
        source.onended = () => {
          voices.delete(source);
          source.disconnect();
          gain.disconnect();
        };
        source.start();
        played++;
        return true;
      } catch {
        return false;
      }
    },
    setPaused(value: boolean) {
      paused = value;
      if (value) stop();
    },
    stop,
    snapshot: () => ({
      state: context?.state ?? "locked",
      played,
      voices: voices.size,
    }),
    dispose() {
      stop();
      if (context) void context.close().catch(() => {});
      context = null;
      buffers.clear();
    },
  };
}
export type ShotAudio = ReturnType<typeof createShotAudio>;
