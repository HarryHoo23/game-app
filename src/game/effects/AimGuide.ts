import Phaser from "phaser";
import type { Vec } from "../../domain/scoring/basketDetector";
import { predictTrajectory } from "../../domain/shooting/trajectory";
import { ORIGIN } from "../physics/court";
import { colorNumber } from "../themes/theme";
export class AimGuide {
  private graphic: Phaser.GameObjects.Graphics;
  constructor(scene: Phaser.Scene) {
    this.graphic = scene.add.graphics().setDepth(8);
  }
  clear() {
    this.graphic.clear();
  }
  draw(velocity: Vec) {
    const g = this.graphic;
    g.clear();
    const points = predictTrajectory(velocity);
    points.forEach((p, i) => {
      if (i % 6 === 0) {
        g.fillStyle(colorNumber("mint"), 0.75 - i * 0.009);
        g.fillCircle(p.x, p.y, 2.1 - i * 0.013);
      }
    });
    const end = points[points.length - 1];
    g.fillStyle(colorNumber("mint"), 0.06);
    g.fillCircle(end.x, end.y, 10);
    g.fillStyle(colorNumber("mint"), 0.1);
    g.fillCircle(end.x, end.y, 6);
    g.fillStyle(colorNumber("mint"), 0.8);
    g.fillCircle(end.x, end.y, 2.6);
    const angle = Math.atan2(velocity.y, velocity.x),
      x = ORIGIN.x + Math.cos(angle) * 56,
      y = ORIGIN.y + Math.sin(angle) * 56;
    g.lineStyle(1.8, colorNumber("mint"), 0.7);
    g.lineBetween(x - Math.cos(angle) * 12, y - Math.sin(angle) * 12, x, y);
    g.lineBetween(
      x,
      y,
      x - Math.cos(angle - 0.6) * 7,
      y - Math.sin(angle - 0.6) * 7,
    );
    g.lineBetween(
      x,
      y,
      x - Math.cos(angle + 0.6) * 7,
      y - Math.sin(angle + 0.6) * 7,
    );
  }
}
