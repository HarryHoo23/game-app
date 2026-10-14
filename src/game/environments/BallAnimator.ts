import Phaser from "phaser";
import { physics } from "../../data/physics";
import { colorNumber } from "../themes/theme";
import { ballDeformation } from "../../domain/shooting/BallAnimation";
import type { ShotPose } from "../../domain/shooting/ShotTrajectory";
/** Pure trajectory poses drive the visual; Matter only supplies the post-arrival bounce. */
export class BallAnimator {
  readonly image: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Ellipse;
  private reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    .matches;
  constructor(
    scene: Phaser.Scene,
    private body: Phaser.Physics.Matter.Image,
  ) {
    body.setVisible(false);
    this.shadow = scene.add
      .ellipse(
        physics.origin.x,
        physics.origin.y + 67,
        135,
        19,
        colorNumber("ink"),
        0.7,
      )
      .setDepth(1);
    this.image = scene.add.image(body.x, body.y, "ball").setDepth(6);
    this.idle(0);
  }
  idle(power: number) {
    const squash = ballDeformation(this.reduced ? 0 : power, null),
      size = physics.foregroundBallSize;
    this.image
      .setPosition(physics.origin.x, physics.origin.y)
      .setRotation(0)
      .setDepth(6)
      .setDisplaySize(size * squash.x, size * squash.y)
      .setAlpha(1);
    this.shadow
      .setPosition(physics.origin.x, physics.origin.y + 67)
      .setScale(1)
      .setAlpha(0.7);
  }
  flight(pose: ShotPose, elapsedMs: number) {
    const stretch = ballDeformation(0, this.reduced ? null : elapsedMs),
      size = physics.foregroundBallSize * pose.scale;
    this.image
      .setPosition(pose.x, pose.y)
      .setRotation(pose.rotation)
      .setDepth(pose.velocity.y > 0 ? 4 : 6)
      .setDisplaySize(size * stretch.x, size * stretch.y)
      .setAlpha(1);
    this.shadow
      .setPosition(
        pose.x,
        Phaser.Math.Linear(physics.origin.y + 67, pose.y + 100, pose.t),
      )
      .setScale(pose.scale)
      .setAlpha(0.35 * (1 - pose.t));
  }
  rebound(scale: number) {
    const size = physics.foregroundBallSize * scale;
    this.image
      .setPosition(this.body.x, this.body.y)
      .setRotation(this.body.rotation)
      .setDepth(4)
      .setDisplaySize(size, size)
      .setAlpha(1);
    this.shadow.setAlpha(0);
  }
}
