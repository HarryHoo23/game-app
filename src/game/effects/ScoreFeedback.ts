import Phaser from "phaser";
import { theme, colorNumber } from "../themes/theme";
export function showScoreFeedback(
  scene: Phaser.Scene,
  x: number,
  y: number,
  score: number,
  streak: number,
  reduced: boolean,
) {
  // Below and left of the hoop: the result is visible without covering the ball's entry.
  const fx = scene.add
    .container(Math.max(98, x - 115), y + 126)
    .setDepth(20)
    .setAngle(-9);
  const brush = scene.add.graphics();
  // Broken ink strokes give the fleeting callout a painted edge, not a rectangular card.
  for (let i = 0; i < 12; i++) {
    brush.lineStyle(9, colorNumber("ink"), 0.85);
    const start = -82 + ((i * 13) % 16),
      end = 78 - ((i * 17) % 21),
      y = -39 + i * 7;
    brush.lineBetween(start, y, end, y - 7);
  }
  brush.lineStyle(2, colorNumber("mint"), 0.2);
  for (let i = 0; i < 8; i++)
    brush.lineBetween(-83 + i * 5, -33 + i, 72 - i * 2, -46 + i * 2);
  for (let i = 0; i < 15; i++) {
    brush.fillStyle(colorNumber("mint"), 0.1);
    brush.fillCircle(
      -76 + ((i * 41) % 154),
      -42 + ((i * 23) % 90),
      0.7 + (i % 3) * 0.3,
    );
  }
  const title = scene.add
    .text(
      0,
      -27,
      score === 4 ? "PERFECT!" : score === 3 ? "SWISH!" : "BUCKET!",
      {
        fontFamily: "Permanent Marker",
        fontSize: score === 4 ? "27px" : "32px",
        color: theme.colors.mint,
      },
    )
    .setOrigin(0.5);
  const value = scene.add
    .text(0, 12, `+${score}`, {
      fontFamily: "Permanent Marker",
      fontSize: "32px",
      color: theme.colors.cream,
    })
    .setOrigin(0.5);
  fx.add([brush, title, value]);
  if (streak > 1)
    fx.add(
      scene.add
        .text(0, 48, `COMBO ×${streak}`, {
          fontFamily: "Barlow",
          fontSize: "10px",
          letterSpacing: 2,
          color: theme.colors.mint,
        })
        .setOrigin(0.5),
    );
  if (!reduced) {
    fx.setScale(0.9);
    scene.tweens.add({
      targets: fx,
      scaleX: 1,
      scaleY: 1,
      duration: 140,
      ease: "Cubic.easeOut",
    });
  }
  scene.tweens.add({
    targets: fx,
    alpha: 0,
    y: fx.y - (reduced ? 0 : 15),
    delay: 430,
    duration: theme.motion.score - 430,
    onComplete: () => fx.destroy(),
  });
}
