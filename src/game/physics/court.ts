import type { ShotPlan, ShotPose } from "../../domain/shooting/ShotTrajectory";
import { getHoopGeometry } from "../../domain/shooting/hoopGeometry";
import { physics } from "../../data/physics";
import Phaser from "phaser";
import type { LevelConfig } from "../../data/levels";
export const BALL_RADIUS = physics.ballRadius;
export const ORIGIN = physics.origin;
export const STEP_MS = physics.stepMs;
import {
  advanceDeferred,
  contactBounds,
  contactGap,
  findMissContact,
  HANDOFF_SKIN,
  type ContactShape,
} from "./SafeHandoff";
export class MatterCourt {
  private contacts: MatterJS.BodyType[] = [];
  private pending: ShotPose | null = null;
  private pendingMs = 0;
  get pendingPose() {
    return this.pending;
  }
  get pendingElapsedMs() {
    return this.pendingMs;
  }
  private get contactShapes(): ContactShape[] {
    return this.contacts.map((b) => ({
      label: b.label,
      vertices: b.vertices!,
      bounds: b.bounds!,
    }));
  }
  get observationBounds() {
    return contactBounds(this.contactShapes, BALL_RADIUS);
  }
  findMissContact(plan: ShotPlan, from: number, to: number) {
    return findMissContact(plan, from, to, this.contactShapes, BALL_RADIUS);
  }
  advancePending(delta: number) {
    const pose = advanceDeferred(this.pending!, delta);
    this.pendingMs += delta;
    return { pose, released: this.finishControlled(pose) };
  }
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
    this.contacts.push(
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
      ),
    );
    this.contacts.push(
      body.circle(x - geometry.rimHalfWidth, y, geometry.rimRadius, {
        isStatic: true,
        label: "rim",
        restitution: 0.55,
      }),
    );
    this.contacts.push(
      body.circle(x + geometry.rimHalfWidth, y, geometry.rimRadius, {
        isStatic: true,
        label: "rim",
        restitution: 0.55,
      }),
    );
    for (const side of [-1, 1])
      this.contacts.push(
        body.rectangle(
          x + (side * geometry.boardWidth) / 2,
          geometry.boardSideY,
          geometry.boardThickness,
          geometry.boardSideHeight,
          { isStatic: true, label: "backboard", restitution: 0.7 },
        ),
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
    this.pending = null;
    this.pendingMs = 0;
    this.ball.setStatic(true);
    this.ball.setCollidesWith(0);
  }
  placeControlled(pose: ShotPose) {
    this.ball.setPosition(pose.x, pose.y);
    this.ball.setRotation(pose.rotation);
  }
  finishControlled(pose: ShotPose) {
    // Continue smoothly with collisions OFF if depth-ineligible motion already
    // occupied a frame. Never rewind the visible ball or enable inside a body.
    this.placeControlled(pose);
    if (contactGap(pose, BALL_RADIUS, this.contactShapes) < HANDOFF_SKIN) {
      this.pending = pose;
      return false;
    }
    this.pending = null;
    this.ball.setCollidesWith(0xffffffff);
    this.ball.setStatic(false);
    this.ball.setPosition(pose.x, pose.y);
    this.ball.setVelocity(pose.velocity.x, pose.velocity.y);
    this.ball.setAngularVelocity(pose.angularVelocity);
    return true;
  }
  step() {
    this.scene.matter.world.step(STEP_MS);
  }
  reset() {
    this.pending = null;
    this.pendingMs = 0;
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
