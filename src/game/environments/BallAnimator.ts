import { hoopLayout, type BallDepthState } from "../hoop/hoopLayout";
import Phaser from "phaser";
import { HoopRenderer } from "../hoop/HoopRenderer";
import {
  PERSPECTIVE_CONFIG,
  ballDisplaySize,
  projectShot,
  projectCourtPoint,
} from "../presentation/perspective";
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
    private hoop: HoopRenderer,
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
    this.image = scene.add
      .image(body.x, body.y, "ball")
      .setDepth(hoopLayout.ballDepth.APPROACHING);
    this.idle(0);
  }
  idle(power: number) {
    const squash = ballDeformation(this.reduced ? 0 : power, null),
      size = ballDisplaySize(1);
    this.image
      .setRotation(0)
      .setDepth(hoopLayout.ballDepth.APPROACHING)
      .setAlpha(1);
    this.hoop.placeBall(
      this.image,
      { x: physics.origin.x, y: PERSPECTIVE_CONFIG.idleBallY },
      size * squash.x,
      size * squash.y,
      hoopLayout.ballDepth.APPROACHING,
    );
    this.shadow
      .setPosition(physics.origin.x, PERSPECTIVE_CONFIG.idleBallY + size / 2)
      .setScale(1)
      .setAlpha(0.7);
  }
  flight(
    pose: ShotPose,
    elapsedMs: number,
    state: BallDepthState = "APPROACHING",
  ) {
    const stretch = ballDeformation(0, this.reduced ? null : elapsedMs),
      size = ballDisplaySize(pose.scale);
    this.image
      .setRotation(pose.rotation)
      .setDepth(hoopLayout.ballDepth[state])
      .setAlpha(1);
    const projected = projectShot(pose, this.hoop.getRimCenter());
    this.hoop.placeBall(
      this.image,
      projected,
      size * stretch.x,
      size * stretch.y,
      hoopLayout.ballDepth[state],
    );
    this.shadow
      .setPosition(
        projected.x,
        Phaser.Math.Linear(
          PERSPECTIVE_CONFIG.idleBallY + ballDisplaySize(1) / 2,
          projected.y + size / 2,
          pose.t,
        ),
      )
      .setScale(pose.scale)
      .setAlpha(0.35 * (1 - pose.t));
  }
  rebound(scale: number) {
    const size = ballDisplaySize(scale);
    this.image
      .setRotation(this.body.rotation)
      .setDepth(hoopLayout.ballDepth.BELOW_HOOP)
      .setAlpha(1);
    this.hoop.placeBall(
      this.image,
      projectCourtPoint(this.body, this.hoop.getRimCenter()),
      size,
      size,
      hoopLayout.ballDepth.BELOW_HOOP,
    );
    this.shadow.setAlpha(0);
  }
}
