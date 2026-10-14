import { createBallTexture } from "../assets/ballTexture";
import Phaser from "phaser";
export function makeTextures(scene: Phaser.Scene) {
  const g = scene.make.graphics({ x: 0, y: 0 });
  createBallTexture(scene);
  g.clear();
  g.fillStyle(0x9df2d2);
  g.fillCircle(4, 4, 4);
  g.generateTexture("spark", 8, 8);
  g.destroy();
}
export function court(scene: Phaser.Scene, menu = false) {
  const g = scene.add.graphics();
  g.fillGradientStyle(0x142831, 0x142831, 0x203740, 0x203740);
  g.fillRect(0, 0, 400, 712);
  // Distant city silhouettes and a quiet fence.
  g.fillStyle(0x0c1b23, 0.55);
  for (let i = 0; i < 12; i++) {
    const h = 45 + ((i * 37) % 90);
    g.fillRect(i * 39 - 15, 290 - h, 30, h);
  }
  g.lineStyle(1, 0x58747c, 0.12);
  for (let x = -350; x < 750; x += 32) {
    g.lineBetween(x, 170, x + 270, 440);
    g.lineBetween(x, 440, x + 270, 170);
  }
  g.fillStyle(0x263c42);
  g.fillRect(0, 440, 400, 272);
  g.lineStyle(1, 0x729088, 0.22);
  g.lineBetween(0, 440, 400, 440);
  g.lineStyle(2, 0x9db4a1, 0.22);
  g.strokeEllipse(200, 565, 330, 150);
  g.strokeEllipse(200, 565, 135, 60);
  g.lineBetween(0, 565, 400, 565);
  g.lineBetween(35, 712, 110, 440);
  g.lineBetween(365, 712, 290, 440);
  g.lineStyle(1, 0x9db4a1, 0.1);
  g.lineBetween(0, 670, 400, 670);
  scene.add
    .text(20, 452, "AH / PUBLIC COURT 01", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#78918c",
    })
    .setAlpha(0.6);
  if (menu) {
    scene.add.image(285, 467, "ball").setDisplaySize(125, 125).setAngle(-18);
    scene.add.ellipse(278, 543, 125, 18, 0x07141a, 0.3);
  }
  return g;
}
