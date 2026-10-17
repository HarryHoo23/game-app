/** The full source oval is the only rim geometry. Coordinates are in source pixels.
 * Its equator is the gameplay anchor. The front crop retains the near arc and
 * mounting plate; cropping never changes the image origin or transform.
 */
export const canonicalRim = {
  frame: { x: 31, y: 397, width: 1193, height: 514 },
  width: 104,
  originX: 0.5,
  originY: 0.35,
  frontStartY: 180,
  // Rear inner underside: the net's highest (central) loop attaches here.
  netAttachmentSourceY: 490,
} as const;
export const canonicalRimScale = canonicalRim.width / canonicalRim.frame.width;
export const netAttachmentY =
  (canonicalRim.netAttachmentSourceY -
    canonicalRim.frame.y -
    canonicalRim.frame.height * canonicalRim.originY) *
  canonicalRimScale;

/** Gameplay dimensions never depend on PNG canvas bounds. Layer trims are source pixels. */
export const hoopLayout = {
  rimWidth: canonicalRim.width,
  layers: {
    backboard: {
      frame: { x: 20, y: 268, width: 1214, height: 710 },
      offsetX: 0,
      offsetY: 24,
      width: 250,
      originX: 0.5,
      originY: 1,
      depth: 2,
      flipY: false,
    },
    rimBack: {
      ...canonicalRim,
      offsetX: 0,
      offsetY: 0,
      depth: 3,
      flipY: false,
    },
    net: {
      frame: { x: 50, y: 110, width: 1165, height: 1004 },
      offsetX: 0,
      offsetY: netAttachmentY,
      width: 98,
      originX: 0.5,
      originY: 0,
      depth: 5,
      flipY: false,
    },
    rimFront: {
      ...canonicalRim,
      offsetX: 0,
      offsetY: 0,
      depth: 6,
      flipY: false,
    },
  },
  ballDepth: { APPROACHING: 7, AT_RIM: 4, IN_NET: 4, BELOW_HOOP: 7 },
  sensors: { top: -22, center: 0, exit: 128, halfWidth: 48 },
  netMotion: {
    delayMs: 0,
    stretchMs: 65,
    stretchY: 1.36,
    squeezeX: 0.9,
    dropPx: 6,
    perfectStretchY: 1.4,
    perfectSqueezeX: 0.88,
    perfectDropPx: 8,
    rimStretchY: 1.2,
    rimSqueezeX: 0.95,
    rimDropPx: 4,
    swayDegrees: [3, -2, 1, 0],
    swayDurationMs: [80, 110, 100, 90],
  },
  rimMotion: { durationMs: 100, offset: 1.5 },
} as const;
export type HoopLayer = keyof typeof hoopLayout.layers;
export type BallDepthState = keyof typeof hoopLayout.ballDepth;
