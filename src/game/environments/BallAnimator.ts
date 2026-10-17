import { feedbackFeel } from "../../data/feedbackFeel";
import { postShotDepth } from "../../domain/shooting/ImpactResponse";
import { hoopLayout, type BallDepthState } from "../hoop/hoopLayout";
import Phaser from "phaser";
import { HoopRenderer } from "../hoop/HoopRenderer";
import {
  PERSPECTIVE_CONFIG,
  ballDisplaySize,
  projectShot,
  projectCourtPoint,
  rimOnScreen,
} from "../presentation/perspective";
import { physics } from "../../data/physics";
import { colorNumber } from "../themes/theme";
import { ballDeformation } from "../../domain/shooting/BallAnimation";
import type { ShotPose } from "../../domain/shooting/ShotTrajectory";
/** Pure trajectory poses drive the visual; Matter only supplies the post-arrival bounce. */
export class BallAnimator {
  readonly image: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Ellipse;
  private ghosts: Phaser.GameObjects.Image[];
  private history = feedbackFeel.trail.alphas.map(() => ({
    x: 0,
    y: 0,
    size: 0,
    rotation: 0,
  }));
  private historyCount = 0;
  private lastSample = 0;
  private lastFlightTime = 0;
  private lastFlightX = 0;
  private lastFlightY = 0;
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
    this.ghosts = feedbackFeel.trail.alphas.map(() =>
      scene.add.image(0, 0, "ball").setVisible(false),
    );
    this.idle(0);
  }
  idle(power: number) {
    this.clearTrail();
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
    this.updateTrail(
      projected,
      size,
      pose.rotation,
      elapsedMs,
      state === "APPROACHING" && pose.t < 0.93,
    );
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
  private clearTrail() {
    this.ghosts.forEach((image) => image.setVisible(false));
    this.historyCount = 0;
    this.lastFlightTime = 0;
    this.lastSample = 0;
  }
  private updateTrail(
    point: { x: number; y: number },
    size: number,
    rotation: number,
    elapsed: number,
    allowed: boolean,
  ) {
    const delta = elapsed - this.lastFlightTime;
    const speed =
      this.lastFlightTime > 0 && delta > 0
        ? Math.hypot(point.x - this.lastFlightX, point.y - this.lastFlightY) /
          delta
        : 0;
    this.lastFlightTime = elapsed;
    this.lastFlightX = point.x;
    this.lastFlightY = point.y;
    if (
      !allowed ||
      this.reduced ||
      speed < feedbackFeel.trail.minSpeedPxPerMs
    ) {
      this.ghosts.forEach((image) => image.setVisible(false));
      this.historyCount = 0;
      return;
    }
    if (elapsed - this.lastSample >= feedbackFeel.trail.sampleIntervalMs) {
      for (let i = this.history.length - 1; i > 0; i--)
        Object.assign(this.history[i], this.history[i - 1]);
      Object.assign(this.history[0], point, { size, rotation });
      this.lastSample = elapsed;
      this.historyCount = Math.min(this.historyCount + 1, this.history.length);
    }
    this.ghosts.forEach((image, index) => {
      image.setVisible(index < this.historyCount);
      if (index >= this.historyCount) return;
      const sample = this.history[index];
      image
        .setRotation(sample.rotation)
        .setAlpha(feedbackFeel.trail.alphas[index]);
      this.hoop.placeBall(
        image,
        sample,
        sample.size,
        sample.size,
        hoopLayout.ballDepth.APPROACHING - 0.1,
      );
    });
  }
  rebound(scale: number) {
    this.clearTrail();
    const size = ballDisplaySize(scale);
    const rim = this.hoop.getRimCenter();
    const netBottom = this.hoop.net.getBounds().bottom;
    const visualExitY = Math.max(
      rim.y + hoopLayout.sensors.exit,
      rim.y +
        (netBottom - rimOnScreen(rim).y + size / 2) /
          PERSPECTIVE_CONFIG.hoopScale,
    );
    const state = postShotDepth(this.body, rim, visualExitY);
    this.image
      .setRotation(this.body.rotation)
      .setDepth(hoopLayout.ballDepth[state])
      .setAlpha(1);
    this.hoop.placeBall(
      this.image,
      projectCourtPoint(this.body, this.hoop.getRimCenter()),
      size,
      size,
      hoopLayout.ballDepth[state],
    );
    this.shadow.setAlpha(0);
  }
}
