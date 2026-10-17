/** Presentation only: score ownership stays in the ordered hoop sensors. */
export const feedbackFeel = {
  camera: {
    rimShakeMs: 70,
    rimShakeStrength: 0.0015,
    swishPunch: 1.018,
    perfectPunch: 1.025,
    rimMakePunch: 1.008,
    durationMs: 140,
  },
  scoreCallout: {
    swishFontPx: 32,
    perfectFontPx: 37,
    makeFontPx: 32,
    spawnScale: 0.82,
    peakScale: 1.06,
    popMs: 95,
    settleMs: 85,
    fadeStartMs: 460,
    lifetimeMs: 800,
    risePx: 15,
  },
  releaseAudio: {
    durationMs: 42,
    peakGain: 0.018,
    attackMs: 3,
    filterHz: 950,
  },
  particles: { swishCount: 9, perfectCount: 18, depth: 12 },
  trail: {
    alphas: [0.11, 0.06, 0.025],
    sampleIntervalMs: 24,
    minSpeedPxPerMs: 0.35,
  },
} as const;
