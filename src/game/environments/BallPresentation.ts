import Phaser from "phaser";
import { colorNumber } from "../themes/theme";
import { BALL_RADIUS, ORIGIN } from "../physics/court";
/** Foreground scale only; never resizes or moves the Matter collision body. */
export class BallPresentation {
  private image: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Ellipse;
  constructor(
    scene: Phaser.Scene,
    private body: Phaser.Physics.Matter.Image,
    private hoopY: number,
  ) {
    body.setVisible(false);
    this.shadow = scene.add
      .ellipse(ORIGIN.x, ORIGIN.y + 42, 84, 16, colorNumber("ink"), 0.7)
      .setDepth(3);
    this.image = scene.add
      .image(body.x, body.y, "ball")
      .setDepth(4)
      .setDisplaySize(82, 82);
  }
  sync(flying: boolean) {
    this.image
      .setPosition(this.body.x, this.body.y)
      .setRotation(this.body.rotation);
    const depth = Phaser.Math.Clamp(
      (this.body.y - this.hoopY - 60) / (ORIGIN.y - this.hoopY - 60),
      0,
      1,
    );
    const size = flying ? BALL_RADIUS * 2 + 54 * depth : 82;
    this.image.setDisplaySize(size, size);
    this.shadow
      .setPosition(this.body.x, ORIGIN.y + 42)
      .setScale(flying ? 0.45 : 1)
      .setAlpha(flying ? 0.14 : 0.7);
  }
}
