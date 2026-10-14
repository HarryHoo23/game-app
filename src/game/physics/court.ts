import type { ShotPose } from "../../domain/shooting/ShotTrajectory";
import { getHoopGeometry } from "../../domain/shooting/hoopGeometry";
import { physics } from "../../data/physics";
import Phaser from "phaser";
import type { LevelConfig } from "../../data/levels";
export const BALL_RADIUS = physics.ballRadius;
export const ORIGIN = physics.origin;
export const STEP_MS = physics.stepMs;
export class MatterCourt {
  readonly ball: Phaser.Physics.Matter.Image;
  constructor(
    private scene: Phaser.Scene,
    readonly level: LevelConfig,
  ) {
    scene.matter.world.autoUpdate = false;
    scene.matter.world.setGravity(0, 1, physics.gravity);
    const { hoopX: x, hoopY: y } = level;
    const body = scene.matter.add;
    const geometry = getHoopGeometry(level);
    body.rectangle(200, 700, 600, 25, {
      isStatic: true,
      label: "ground",
      restitution: 0.65,
    });
    body.rectangle(
      x,
      geometry.boardTopY,
      geometry.boardWidth,
      geometry.boardThickness,
      {
        isStatic: true,
        label: "backboard",
        restitution: 0.7,
      },
    );
    body.circle(x - geometry.rimHalfWidth, y, geometry.rimRadius, {
      isStatic: true,
      label: "rim",
      restitution: 0.55,
    });
    body.circle(x + geometry.rimHalfWidth, y, geometry.rimRadius, {
      isStatic: true,
      label: "rim",
      restitution: 0.55,
    });
    for (const side of [-1, 1])
      body.rectangle(
        x + (side * geometry.boardWidth) / 2,
        geometry.boardSideY,
        geometry.boardThickness,
        geometry.boardSideHeight,
        { isStatic: true, label: "backboard", restitution: 0.7 },
      );
    this.ball = scene.matter.add.image(ORIGIN.x, ORIGIN.y, "ball", undefined, {
      label: "ball",
      restitution: 0.72,
      friction: 0.02,
      frictionAir: 0,
    });
    this.ball.setDisplaySize(BALL_RADIUS * 2, BALL_RADIUS * 2);
    this.ball.setCircle(BALL_RADIUS, {
      label: "ball",
      restitution: 0.72,
      friction: 0.02,
      frictionAir: 0,
    });
    this.ball.setStatic(true);
    this.ball.setDepth(4);
  }
  beginControlled() {
    this.ball.setStatic(true);
    this.ball.setCollidesWith(0);
  }
  placeControlled(pose: ShotPose) {
    this.ball.setPosition(pose.x, pose.y);
    this.ball.setRotation(pose.rotation);
  }
  finishControlled(pose: ShotPose) {
    this.ball.setCollidesWith(0xffffffff);
    this.ball.setStatic(false);
    this.ball.setPosition(pose.x, pose.y);
    this.ball.setVelocity(pose.velocity.x, pose.velocity.y);
    this.ball.setAngularVelocity(pose.angularVelocity);
  }
  step() {
    this.scene.matter.world.step(STEP_MS);
  }
  reset() {
    this.ball.setStatic(true);
    this.ball.setCollidesWith(0xffffffff);
    this.ball.setPosition(ORIGIN.x, ORIGIN.y);
    this.ball.setVelocity(0, 0);
    this.ball.setAngularVelocity(0);
    this.ball.setAngle(0);
  }
  destroy() {
    this.ball.destroy();
  }
}
