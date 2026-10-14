export const physics = {
  width: 400,
  height: 712,
  ballRadius: 14,
  origin: { x: 110, y: 610 },
  stepMs: 1000 / 120,
  gravity: 0.001,
  maxSpeed: 17,
  minDrag: 18,
  maxDrag: 170,
  shotTimeout: 7000,
  resetDelay: 950,
} as const;
