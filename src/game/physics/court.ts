import {
  sampleShot,
  type ShotPlan,
  type ShotPose,
  type ShotResult,
} from "../../domain/shooting/ShotTrajectory";
import { getHoopGeometry } from "../../domain/shooting/hoopGeometry";
import { physics } from "../../data/physics";
import Phaser from "phaser";
import type { LevelConfig } from "../../data/levels";
import { ballContactRadius } from "../../data/ballGeometry";
import {
  rimStrips,
  rimContactMode,
  contactCategory,
  rimContactConfig,
  type RimContactMode,
} from "../hoop/rimGeometry";
export const ORIGIN = physics.origin;
export const STEP_MS = physics.stepMs;
import {
  advanceDeferred,
  contactBounds,
  contactGap,
  findMissContact,
  HANDOFF_SKIN,
  courtPose,
  type ContactShape,
} from "./SafeHandoff";
export class MatterCourt {
  private contacts: MatterJS.BodyType[] = [];
  private pending: ShotPose | null = null;
  private pendingMs = 0;
  private mode: RimContactMode = "opening";
  private quarantined = new Set<number>();
  private eligibilityStarted = false;
  get contactMode() {
    return this.mode;
  }
  get radius() {
    return (this.ball.body as MatterJS.BodyType & { circleRadius: number })
      .circleRadius;
  }
  private resizeBall(scale: number) {
    const ratio = ballContactRadius(scale) / this.radius;
    if (Math.abs(ratio - 1) < 1e-12) return;
    const body = this.ball.body as MatterJS.BodyType,
      wasStatic = body.isStatic;
    // Scale finite mass/inertia, not the Infinity values of a static body.
    // No world step occurs while toggled; its collision mask stays OFF.
    if (wasStatic) this.scene.matter.body.setStatic(body, false);
    this.scene.matter.body.scale(body, ratio, ratio);
    if (wasStatic) this.scene.matter.body.setStatic(body, true);
  }
  private get contactMask() {
    const board =
      contactCategory.boardTop |
      contactCategory.boardLeft |
      contactCategory.boardRight;
    const mask =
      contactCategory.environment |
      board |
      (this.mode === "opening" ? 0 : contactCategory[this.mode]);
    return [...this.quarantined].reduce((m, category) => m & ~category, mask);
  }
  get quarantinedCategories() {
    return [...this.quarantined];
  }
  private parts(body: MatterJS.BodyType): ContactShape[] {
    return (body.parts.length > 1 ? body.parts.slice(1) : [body]).map((b) => ({
      label: b.label,
      vertices: b.vertices!,
      bounds: b.bounds!,
    }));
  }
  private refreshQuarantine(pose: { x: number; y: number }, radius: number) {
    for (const body of this.contacts) {
      const category = body.collisionFilter.category!;
      if (
        this.quarantined.has(category) &&
        contactGap(pose, radius, this.parts(body)) > HANDOFF_SKIN
      )
        this.quarantined.delete(category);
    }
  }
  isEligibleContact(body: MatterJS.BodyType) {
    return Boolean(body.collisionFilter.category! & this.contactMask);
  }
  get pendingPose() {
    return this.pending;
  }
  get pendingElapsedMs() {
    return this.pendingMs;
  }
  private get contactShapes(): ContactShape[] {
    return this.contacts
      .filter((b) => Boolean(b.collisionFilter.category! & this.contactMask))
      .flatMap((b) => (b.parts.length > 1 ? b.parts.slice(1) : [b]))
      .map((b) => ({
        label: b.label,
        vertices: b.vertices!,
        bounds: b.bounds!,
      }));
  }
  get observationBounds() {
    return contactBounds(this.contactShapes, this.radius);
  }
  findMissContact(plan: ShotPlan, from: number, to: number) {
    const start = Math.max(from, rimContactConfig.lateApproachProgress);
    if (to <= start) return null;
    const pose = courtPose(plan, start),
      radius = ballContactRadius(pose.scale);
    if (!this.eligibilityStarted) {
      this.eligibilityStarted = true;
      // A projected frame already occupied during foreground motion is NOT a
      // new impact. Quarantine only that body; other surfaces can still be hit.
      for (const body of this.contacts)
        if (
          this.isEligibleContact(body) &&
          contactGap(pose, radius, this.parts(body)) <= HANDOFF_SKIN
        )
          this.quarantined.add(body.collisionFilter.category!);
    }
    this.refreshQuarantine(pose, radius);
    return findMissContact(plan, from, to, this.contactShapes, (t) =>
      ballContactRadius(sampleShot(plan, t).scale),
    );
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
          collisionFilter: {
            category: contactCategory.boardTop,
            mask: 0xffffffff,
            group: 0,
          },
        },
      ),
    );
    for (const arc of ["front", "back"] as const) {
      const options = {
        isStatic: true,
        label: "rim",
        restitution: 0.55,
        collisionFilter: {
          category: contactCategory[arc],
          mask: 0xffffffff,
          group: 0,
        },
        plugin: { rimArc: arc },
      };
      const parts = rimStrips(arc, { x, y }).map((vertices) => {
        const center = scene.matter.vertices.centre(vertices);
        return scene.matter.bodies.fromVertices(
          center.x,
          center.y,
          [vertices],
          options,
        );
      });
      scene.matter.bodies.flagCoincidentParts(parts, 0.001);
      const rim = scene.matter.body.create({ ...options, parts });
      scene.matter.world.add(rim);
      this.contacts.push(rim);
    }
    for (const side of [-1, 1])
      this.contacts.push(
        body.rectangle(
          x + (side * geometry.boardWidth) / 2,
          geometry.boardSideY,
          geometry.boardThickness,
          geometry.boardSideHeight,
          {
            isStatic: true,
            label: "backboard",
            restitution: 0.7,
            collisionFilter: {
              category:
                side < 0
                  ? contactCategory.boardLeft
                  : contactCategory.boardRight,
              mask: 0xffffffff,
              group: 0,
            },
          },
        ),
      );
    this.ball = scene.matter.add.image(ORIGIN.x, ORIGIN.y, "ball", undefined, {
      label: "ball",
      restitution: 0.72,
      friction: 0.02,
      frictionAir: 0,
    });
    const radius = ballContactRadius(1);
    this.ball.setDisplaySize(radius * 2, radius * 2);
    this.ball.setCircle(radius, {
      label: "ball",
      restitution: 0.72,
      friction: 0.02,
      frictionAir: 0,
    });
    this.ball.setStatic(true);
    this.ball.setDepth(4);
  }
  beginControlled(plan: ShotPlan, result: ShotResult) {
    this.quarantined.clear();
    this.eligibilityStarted = false;
    this.mode = rimContactMode(plan, result);
    this.pending = null;
    this.pendingMs = 0;
    this.ball.setStatic(true);
    this.ball.setCollidesWith(0);
  }
  placeControlled(pose: ShotPose) {
    this.resizeBall(pose.scale);
    this.ball.setPosition(pose.x, pose.y);
    this.ball.setRotation(pose.rotation);
  }
  finishControlled(pose: ShotPose) {
    // Continue smoothly with collisions OFF if depth-ineligible motion already
    // occupied a frame. Never rewind the visible ball or enable inside a body.
    this.placeControlled(pose);
    this.refreshQuarantine(pose, this.radius);
    if (contactGap(pose, this.radius, this.contactShapes) < HANDOFF_SKIN) {
      this.pending = pose;
      return false;
    }
    this.pending = null;
    this.ball.setCollidesWith(this.contactMask);
    this.ball.setStatic(false);
    this.ball.setPosition(pose.x, pose.y);
    this.ball.setVelocity(pose.velocity.x, pose.velocity.y);
    this.ball.setAngularVelocity(pose.angularVelocity);
    return true;
  }
  step() {
    if (!(this.ball.body as MatterJS.BodyType).isStatic) {
      this.refreshQuarantine(this.ball, this.radius);
      this.ball.setCollidesWith(this.contactMask);
    }
    this.scene.matter.world.step(STEP_MS);
  }
  reset() {
    this.quarantined.clear();
    this.eligibilityStarted = false;
    this.mode = "opening";
    this.pending = null;
    this.pendingMs = 0;
    this.ball.setStatic(true);
    this.ball.setCollidesWith(0xffffffff);
    this.ball.setPosition(ORIGIN.x, ORIGIN.y);
    this.ball.setVelocity(0, 0);
    this.ball.setAngularVelocity(0);
    this.ball.setAngle(0);
    this.resizeBall(1);
  }
  destroy() {
    this.ball.destroy();
  }
}
