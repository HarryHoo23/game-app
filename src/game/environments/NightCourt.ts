import Phaser from "phaser";
import { assets } from "../assets/manifest";
import { theme, colorNumber } from "../themes/theme";
export interface CourtTheme {
  backgroundKey: string;
  homeShade: number;
  gameShade: number;
}
export const courtThemes: Record<string, CourtTheme> = {
  night: {
    backgroundKey: assets.nightCourt.key,
    homeShade: 0.12,
    gameShade: 0.18,
  },
};
/** Environment-only layers. No bodies, hit regions, scores or input mapping. */
export function createCourtEnvironment(
  scene: Phaser.Scene,
  mode: "home" | "game",
  themeId = "night",
) {
  const spec = courtThemes[themeId] ?? courtThemes.night;
  scene.add
    .image(200, 356, spec.backgroundKey)
    .setDisplaySize(400, 712)
    .setDepth(-10);
  const shade = scene.add.graphics().setDepth(-9);
  shade.fillStyle(
    colorNumber("background"),
    mode === "home" ? spec.homeShade : spec.gameShade,
  );
  shade.fillRect(0, 0, 400, 712);
  shade.fillGradientStyle(
    colorNumber("ink"),
    colorNumber("ink"),
    colorNumber("background"),
    colorNumber("background"),
    0.18,
    0.18,
    0,
    0,
  );
  shade.fillRect(0, 0, 400, 205);
  // The original side-view launch/collision layout is preserved over the new environment.
  const lettering = scene.add
    .text(23, 395, "GOOD SHOTS.\nLATE NIGHTS.", {
      fontFamily: "Permanent Marker",
      fontSize: "17px",
      color: theme.colors.muted,
      lineSpacing: 1,
    })
    .setAngle(-7)
    .setAlpha(0.28)
    .setDepth(-8);
  if (mode === "game")
    lettering.setText("ONE MORE\nSHOT.").setPosition(22, 398);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduced) {
    const glow = scene.add
      .circle(42, 128, 50, colorNumber("amber"), 0.015)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-8);
    scene.tweens.add({
      targets: glow,
      alpha: 0.45,
      duration: 2700,
      yoyo: true,
      repeat: -1,
    });
  }
  return { backgroundKey: spec.backgroundKey };
}
export function createHomeBall(scene: Phaser.Scene) {
  scene.add.ellipse(291, 548, 188, 22, colorNumber("ink"), 0.62).setDepth(0);
  const ball = scene.add
    .image(306, 457, "ball")
    .setDisplaySize(222, 222)
    .setAngle(-12)
    .setDepth(1);
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    scene.tweens.add({
      targets: ball,
      y: 454,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  return ball;
}
