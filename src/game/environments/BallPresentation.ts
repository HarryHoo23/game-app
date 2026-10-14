import { physics } from "../../data/physics";
import Phaser from "phaser";
import { colorNumber } from "../themes/theme";
import { BALL_RADIUS, ORIGIN } from "../physics/court";
/** Foreground scale only; never resizes or moves the Matter collision body. */
export class BallPresentation {
  private image: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Ellipse;
  private arrow: Phaser.GameObjects.Graphics;
  constructor(
    scene: Phaser.Scene,
    private body: Phaser.Physics.Matter.Image,
    private hoopY: number,
  ) {
    body.setVisible(false);
    this.arrow = scene.add.graphics().setDepth(7);
    this.arrow.lineStyle(2, colorNumber("mint"), 0.7);
    this.arrow.lineBetween(ORIGIN.x, ORIGIN.y - 85, ORIGIN.x, ORIGIN.y - 121);
    this.arrow.lineBetween(
      ORIGIN.x,
      ORIGIN.y - 121,
      ORIGIN.x - 8,
      ORIGIN.y - 111,
    );
    this.arrow.lineBetween(
      ORIGIN.x,
      ORIGIN.y - 121,
      ORIGIN.x + 8,
      ORIGIN.y - 111,
    );
    this.shadow = scene.add
      .ellipse(ORIGIN.x, ORIGIN.y + 67, 135, 19, colorNumber("ink"), 0.7)
      .setDepth(3);
    this.image = scene.add
      .image(body.x, body.y, "ball")
      .setDepth(4)
      .setDisplaySize(physics.foregroundBallSize, physics.foregroundBallSize);
  }
  sync(flying: boolean, aiming = false) {
    this.arrow.setVisible(!flying && !aiming);
    this.image
      .setPosition(this.body.x, this.body.y)
      .setRotation(this.body.rotation)
      .setDepth(
        flying && (this.body.body as MatterJS.BodyType).velocity.y >= 0 ? 4 : 6,
      );
    const depth = Phaser.Math.Clamp(
      (this.body.y - this.hoopY - 60) / (ORIGIN.y - this.hoopY - 60),
      0,
      1,
    );
    const size = flying
      ? BALL_RADIUS * 2 + (physics.foregroundBallSize - BALL_RADIUS * 2) * depth
      : physics.foregroundBallSize;
    this.image.setDisplaySize(size, size);
    this.shadow
      .setPosition(this.body.x, ORIGIN.y + 67)
      .setScale(flying ? 0.45 : 1)
      .setAlpha(flying ? 0.14 : 0.7);
  }
}
