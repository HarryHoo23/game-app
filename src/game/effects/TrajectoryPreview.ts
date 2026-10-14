import Phaser from "phaser";
import {
  predictShot,
  type ShotPlan,
} from "../../domain/shooting/ShotTrajectory";
import { shotFeel } from "../../data/shotFeel";
import { colorNumber } from "../themes/theme";
export class TrajectoryPreview {
  private graphic: Phaser.GameObjects.Graphics;
  constructor(scene: Phaser.Scene) {
    this.graphic = scene.add.graphics().setDepth(8);
  }
  clear() {
    this.graphic.clear();
  }
  draw(plan: ShotPlan) {
    const g = this.graphic;
    g.clear();
    predictShot(plan).forEach((p, i) => {
      const distance = i / (shotFeel.previewDots - 1),
        radius = Phaser.Math.Linear(
          shotFeel.previewNearRadius,
          shotFeel.previewFarRadius,
          distance,
        ),
        alpha = Phaser.Math.Linear(
          shotFeel.previewNearAlpha,
          shotFeel.previewFarAlpha,
          distance,
        );
      g.fillStyle(colorNumber("mint"), alpha * 0.1);
      g.fillCircle(p.x, p.y, radius * 2.2);
      g.fillStyle(colorNumber("mint"), alpha);
      g.fillCircle(p.x, p.y, radius);
    });
  }
}
