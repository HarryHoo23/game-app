import Phaser from "phaser";
import { colorNumber } from "../themes/theme";
import type { LevelConfig } from "../../data/levels";
/** Render the existing side-on hoop, aligned exactly with its original collision geometry. */
export class HoopPresentation {
  readonly rim: Phaser.GameObjects.Graphics;
  private net: Phaser.GameObjects.Graphics;
  constructor(
    private scene: Phaser.Scene,
    level: LevelConfig,
  ) {
    const { hoopX: x, hoopY: y } = level;
    const g = scene.add.graphics();
    g.lineStyle(13, colorNumber("ink"), 0.8);
    g.lineBetween(x + 57, y + 2, x + 57, 430);
    g.lineStyle(6, colorNumber("edge"));
    g.lineBetween(x + 55, y + 2, x + 55, 430);
    g.lineStyle(1, colorNumber("muted"), 0.45);
    g.lineBetween(x + 53, y + 6, x + 53, 430);
    g.fillStyle(colorNumber("ink"), 0.5);
    g.fillRoundedRect(x + 38, y - 84, 23, 99, 3);
    g.fillGradientStyle(
      colorNumber("edge"),
      colorNumber("surface"),
      colorNumber("raised"),
      colorNumber("edge"),
      0.85,
      0.8,
      0.8,
      0.85,
    );
    g.fillRect(x + 45, y - 79, 11, 91);
    g.lineStyle(3, colorNumber("net"), 0.65);
    g.strokeRect(x + 44, y - 81, 13, 95);
    g.lineStyle(1, colorNumber("mint"), 0.5);
    g.lineBetween(x + 48, y - 73, x + 48, y - 4);
    g.lineStyle(3, colorNumber("orange"));
    g.lineBetween(x + 45, y - 30, x + 45, y - 4);
    this.net = scene.add.graphics().setDepth(2);
    const n = this.net;
    n.lineStyle(2.5, colorNumber("ink"), 0.4);
    n.lineBetween(x - 36, y + 5, x - 20, y + 48);
    n.lineBetween(x + 36, y + 5, x + 20, y + 48);
    n.lineStyle(1.4, colorNumber("net"), 0.85);
    for (let i = 0; i < 7; i++) {
      const top = x - 38 + i * 12.67,
        bottom = x - 21 + i * 7;
      n.lineBetween(top, y + 3, bottom, y + 45);
      if (i < 6) {
        n.lineBetween(top, y + 3, bottom + 7, y + 45);
        n.lineBetween(top + 12.67, y + 3, bottom, y + 45);
      }
    }
    n.lineBetween(x - 21, y + 45, x + 21, y + 45);
    this.rim = scene.add.graphics().setDepth(3);
    this.rim.lineStyle(8, colorNumber("ink"), 0.6);
    this.rim.lineBetween(x - 43, y + 2, x + 44, y + 2);
    this.rim.lineStyle(5, colorNumber("orange"));
    this.rim.lineBetween(x - 42, y, x + 42, y);
    this.rim.lineStyle(1.2, colorNumber("amber"));
    this.rim.lineBetween(x - 41, y - 2, x + 41, y - 2);
  }
  react() {
    this.scene.tweens.add({
      targets: this.net,
      alpha: 0.5,
      duration: 90,
      yoyo: true,
      repeat: 2,
    });
  }
}
