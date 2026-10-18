import type Phaser from "phaser";
import type { MatterCourt } from "../physics/court";
import type { HoopRenderer } from "../hoop/HoopRenderer";
import type { HoopPass } from "../hoop/HoopPass";
import type { ShotController } from "../../domain/shooting/ShotController";
import {
  assessShot,
  sampleShot,
  type ShotPlan,
} from "../../domain/shooting/ShotTrajectory";
import type { LevelConfig } from "../../data/levels";
import type { Stats } from "../../domain/progression/progress";
import {
  PERSPECTIVE_CONFIG,
  projectCourtPoint,
  projectShot,
} from "../../data/courtPerspective";
import { ballDisplaySize } from "../presentation/perspective";
import { hoopLayout } from "../hoop/hoopLayout";
import { impactFeel } from "../../data/impactFeel";
import { physics } from "../../data/physics";
import { shotFeel } from "../../data/shotFeel";
import {
  alphaSilhouette,
  closestSurface,
  normalizedVelocity,
  projectVertices,
  type Point,
} from "./auditGeometry";

type Body = MatterJS.BodyType & {
  deltaTime: number;
  positionPrev: Point;
  circleRadius: number;
  vertices: Point[];
};
export interface AuditState {
  court: MatterCourt;
  hoop: HoopRenderer;
  shot: ShotController;
  pass: HoopPass;
  image: Phaser.GameObjects.Image;
  level: LevelConfig;
  stats: Stats;
  settled: boolean;
  score: number;
}
/** An observer only: never writes bodies, shot state, sensors, scoring or camera state. */
export class PhysicsAudit {
  readonly events: Record<string, unknown>[] = [];
  readonly frames: Record<string, unknown>[] = [];
  private startedAt = 0;
  private launched = false;
  private shotIndex = 0;
  private graphics: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private sourceContour: Point[];
  private sourceRadius = 0;
  private predicted?: ReturnType<typeof assessShot>;
  private predictedPoint?: Point;
  private predictedSurface?: Point;
  private potentialSweep?: { t: number; point: Point; label: string };
  private actualPoints: Point[] = [];
  private responsePoint?: Point;
  private origin = "unknown";
  private lastSignature = "";
  private lastResponse?: { incoming: Point; outgoing: Point; origin: string };
  constructor(
    private scene: Phaser.Scene,
    private state: () => AuditState,
  ) {
    this.graphics = scene.add.graphics().setDepth(1000);
    this.text = scene.add
      .text(10, 355, "", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#eafff5",
        backgroundColor: "#06161be6",
        padding: { x: 6, y: 6 },
      })
      .setDepth(1001);
    const image = this.state().image,
      source = image.texture.getSourceImage() as HTMLImageElement;
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    context.drawImage(source, 0, 0);
    this.sourceContour = alphaSilhouette(
      context.getImageData(0, 0, canvas.width, canvas.height).data,
      canvas.width,
      canvas.height,
    );
    this.sourceRadius = Math.max(
      ...this.sourceContour.map((p) =>
        Math.hypot(p.x - image.displayOriginX, p.y - image.displayOriginY),
      ),
    );
    const world = scene.matter.world;
    const onStart = (e: Phaser.Physics.Matter.Events.CollisionStartEvent) =>
      this.collisions("matter:start", e);
    const onActive = (e: Phaser.Physics.Matter.Events.CollisionActiveEvent) =>
      this.collisions("matter:active", e);
    const onEnd = (e: Phaser.Physics.Matter.Events.CollisionEndEvent) =>
      this.collisions("matter:end", e);
    world.on("collisionstart", onStart);
    world.on("collisionactive", onActive);
    world.on("collisionend", onEnd);
    scene.events.on("postupdate", this.render, this);
    const api = {
      events: this.events,
      frames: this.frames,
      snapshot: () => this.measure(),
      clear: () => {
        this.events.length = 0;
        this.frames.length = 0;
      },
      metadata: {
        alphaThreshold: 128,
        alphaRays: this.sourceContour.length,
        sourceSolidRadius: this.sourceRadius,
        colliders: this.bodies().map((b) => ({
          id: b.id,
          label: b.label,
          position: { ...b.position },
          radius: b.circleRadius,
          vertices: b.vertices.map((v) => ({ x: v.x, y: v.y })),
        })),
      },
    };
    Object.assign(window, { __physicsAudit: api });
    scene.events.once("shutdown", () => {
      world.off("collisionstart", onStart);
      world.off("collisionactive", onActive);
      world.off("collisionend", onEnd);
      scene.events.off("postupdate", this.render, this);
      this.graphics.destroy();
      this.text.destroy();
      if (
        (window as Window & { __physicsAudit?: unknown }).__physicsAudit === api
      )
        delete (window as Window & { __physicsAudit?: unknown }).__physicsAudit;
    });
  }
  private body() {
    return this.state().court.ball.body as Body;
  }
  private bodies() {
    return (this.scene.matter.world.localWorld as unknown as { bodies: Body[] })
      .bodies;
  }
  private project = (p: Point) =>
    projectCourtPoint(p, this.state().hoop.getRimCenter());
  private time() {
    return this.scene.matter.world.engine.timing.timestamp - this.startedAt;
  }
  private phase() {
    const s = this.state();
    return s.court.pendingPose
      ? "CONTROLLED_HANDOFF"
      : s.shot.active
        ? "CONTROLLED_FLIGHT"
        : s.pass.active
          ? "CONTROLLED_PASS"
          : !s.shot.currentPlan
            ? "IDLE"
            : s.settled
              ? "MATTER_SETTLING"
              : "MATTER_MISS";
  }
  private nearest(point: Point) {
    return this.bodies()
      .filter((b) => b.label !== "ball" && b.label !== "ground")
      .map((b) => ({
        id: b.id,
        label: b.label,
        ...closestSurface(point, b.vertices),
      }))
      .sort((a, b) => a.distance - b.distance)[0];
  }
  private measure() {
    const s = this.state(),
      b = this.body(),
      near = this.nearest(b.position),
      plan = s.shot.currentPlan;
    const scale = s.shot.active
      ? s.shot.pose!.scale
      : (s.court.pendingPose?.scale ??
        s.pass.pose?.scale ??
        s.shot.pose?.scale ??
        1);
    const nominal = ballDisplaySize(scale) / 2,
      solid = (nominal * this.sourceRadius) / (s.image.frame.width / 2);
    return {
      shotIndex: this.shotIndex,
      ms: this.time(),
      phase: this.phase(),
      flightMs: s.shot.elapsedMs,
      passMs: s.pass.elapsedMs,
      stage: s.pass.stage,
      score: s.score,
      position: { ...b.position },
      centerScreen: this.project(b.position),
      velocity: { ...b.velocity },
      normalizedVelocity: normalizedVelocity(b),
      radius: b.circleRadius,
      matterRadiusScreen: b.circleRadius * PERSPECTIVE_CONFIG.hoopScale,
      visualNominalRadiusScreen: nominal,
      visualSolidRadiusScreen: solid,
      scoringRadiusLogical:
        (physics.foregroundBallSize * (plan?.hoopScale ?? shotFeel.hoopScale)) /
        2,
      mask: b.collisionFilter.mask,
      isStatic: b.isStatic,
      bodyDelta: b.deltaTime,
      nearest: near
        ? { ...near, matterGapLogical: near.distance - b.circleRadius }
        : null,
    };
  }
  event(type: string, data: Record<string, unknown> = {}) {
    if (type === "launch") {
      this.startedAt = this.scene.matter.world.engine.timing.timestamp;
      this.launched = true;
      this.shotIndex++;
      this.actualPoints = [];
      this.responsePoint = undefined;
      this.lastResponse = undefined;
      this.origin = "unknown";
      const s = this.state(),
        plan = data.plan as unknown as ShotPlan;
      this.predicted = assessShot(plan, s.level, s.stats);
      this.predictedPoint = { ...plan.target };
      this.predictedSurface = this.nearest(plan.target)?.point;
      this.potentialSweep = undefined;
      // Counterfactual geometric sweep: surfaces the path would touch IF its mask were enabled.
      for (let i = 0; i <= 240; i++) {
        const pose = sampleShot(plan, i / 240),
          near = this.nearest(pose);
        if (near && near.distance <= this.body().circleRadius) {
          this.potentialSweep = {
            t: i / 240,
            point: near.point,
            label: near.label,
          };
          break;
        }
      }
    }
    if (type === "height-gate" || type === "collision-gate") this.origin = type;
    if (type === "response") {
      this.responsePoint = { ...this.body().position };
      this.lastResponse = {
        incoming: data.incoming as Point,
        outgoing: data.outgoing as Point,
        origin: this.origin,
      };
    }
    this.events.push({
      type,
      ...this.measure(),
      ...data,
      ...(type === "launch"
        ? { candidate: this.predicted, potentialSweep: this.potentialSweep }
        : {}),
      origin: type === "response" ? this.origin : undefined,
    });
    while (this.events.length > 2000) this.events.shift();
  }
  /** Called after each fixed substep, so mask/sensor transitions cannot be missed at low render rates. */
  sampleStep() {
    if (!this.launched) return;
    const m = this.measure(),
      signature = JSON.stringify([m.phase, m.mask, m.isStatic, m.stage]);
    if (signature !== this.lastSignature) {
      this.events.push({ type: "phase", ...m });
      this.lastSignature = signature;
    }
    this.events.push({ type: "step", ...m });
    while (this.events.length > 2000) this.events.shift();
  }
  private collisions(
    type: string,
    e:
      | Phaser.Physics.Matter.Events.CollisionStartEvent
      | Phaser.Physics.Matter.Events.CollisionActiveEvent
      | Phaser.Physics.Matter.Events.CollisionEndEvent,
  ) {
    if (!this.launched) return;
    for (const pair of e.pairs) {
      if (pair.bodyA.label !== "ball" && pair.bodyB.label !== "ball") continue;
      if (type === "matter:end") {
        this.event(type, {
          other:
            pair.bodyA.label === "ball" ? pair.bodyB.label : pair.bodyA.label,
          pairId: pair.id,
          supports: [],
          callbackOrder: "after solver; separated, no current contact supports",
        });
        continue;
      }
      const collision = pair.collision as typeof pair.collision & {
        supportCount?: number;
      };
      const supports = collision.supports
        .slice(0, collision.supportCount ?? collision.supports.length)
        .filter(Boolean)
        .map((p) => ({ x: p.x, y: p.y }));
      if (type === "matter:start") this.actualPoints = supports;
      this.event(type, {
        other:
          pair.bodyA.label === "ball" ? pair.bodyB.label : pair.bodyA.label,
        pairId: pair.id,
        supports,
        normal: { ...collision.normal },
        penetration: collision.depth,
        callbackOrder:
          "before-game-handler; start is before solver, active is after solver",
      });
    }
  }
  private line(points: Point[], color: number, close = false, width = 1) {
    if (!points.length) return;
    const g = this.graphics;
    g.lineStyle(width, color, 0.95);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (const p of points.slice(1)) g.lineTo(p.x, p.y);
    if (close) g.closePath();
    g.strokePath();
  }
  private cross(p: Point, color: number) {
    this.line(
      [
        { x: p.x - 4, y: p.y },
        { x: p.x + 4, y: p.y },
      ],
      color,
    );
    this.line(
      [
        { x: p.x, y: p.y - 4 },
        { x: p.x, y: p.y + 4 },
      ],
      color,
    );
  }
  private arrow(start: Point, velocity: Point, color: number) {
    const end = {
      x: start.x + velocity.x * PERSPECTIVE_CONFIG.hoopScale * 5,
      y: start.y + velocity.y * PERSPECTIVE_CONFIG.hoopScale * 5,
    };
    this.line([start, end], color, false, 2);
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    for (const sign of [-1, 1])
      this.line(
        [
          end,
          {
            x: end.x - 7 * Math.cos(angle + sign * 0.45),
            y: end.y - 7 * Math.sin(angle + sign * 0.45),
          },
        ],
        color,
      );
  }
  private render() {
    const s = this.state(),
      b = this.body(),
      g = this.graphics;
    g.clear();
    // All bodies, including the ball, use the SAME fixed court projection. The foreground
    // blend is deliberately not applied to collider vertices: that mismatch is part of the audit.
    for (const body of this.bodies())
      this.line(
        projectVertices(body.vertices, this.project),
        body.label === "ball" ? 0x4ae9ff : 0xff8559,
        true,
        body.label === "ball" ? 2 : 1,
      );
    const matrix = s.image.getWorldTransformMatrix();
    const silhouette = this.sourceContour.map((p) =>
      matrix.transformPoint(
        p.x - s.image.displayOriginX,
        p.y - s.image.displayOriginY,
      ),
    );
    this.line(silhouette, 0x94ff9e, true, 2);
    const center = matrix.transformPoint(0, 0),
      measured = {
        ...this.measure(),
        visualCenter: { x: center.x, y: center.y },
        visualSolidBounds: {
          left: Math.min(...silhouette.map((p) => p.x)),
          right: Math.max(...silhouette.map((p) => p.x)),
          top: Math.min(...silhouette.map((p) => p.y)),
          bottom: Math.max(...silhouette.map((p) => p.y)),
        },
      };
    this.frames.push(measured);
    if (this.frames.length > 2000) this.frames.shift();
    const rim = s.hoop.getRimCenter(),
      half = hoopLayout.sensors.halfWidth;
    for (const offset of [
      hoopLayout.sensors.top,
      hoopLayout.sensors.center,
      hoopLayout.sensors.exit,
    ])
      this.line(
        [
          { x: rim.x - half, y: rim.y + offset },
          { x: rim.x + half, y: rim.y + offset },
        ].map(this.project),
        0xb49aff,
      );
    // Height gate is a center threshold, NOT a rim surface or an actual contact point.
    if (
      this.predicted?.impact === "frontRim" ||
      this.predicted?.impact === "backRim"
    ) {
      const y =
        rim.y -
        (this.predicted.impact === "frontRim"
          ? impactFeel.frontContactLead
          : impactFeel.backContactLead);
      this.line(
        [
          { x: rim.x - half, y },
          { x: rim.x + half, y },
        ].map(this.project),
        0xff61cb,
      );
    }
    if (this.predictedPoint)
      this.cross(this.project(this.predictedPoint), 0xffe36b);
    if (this.predictedSurface)
      this.cross(this.project(this.predictedSurface), 0xffb12f);
    if (this.potentialSweep)
      this.cross(this.project(this.potentialSweep.point), 0xffffff);
    for (const p of this.actualPoints) this.cross(this.project(p), 0x4ae9ff);
    if (this.responsePoint)
      this.cross(this.project(this.responsePoint), 0xff61cb);
    const velocity = s.shot.active
      ? s.shot.pose!.velocity
      : s.pass.active
        ? s.pass.pose!.velocity
        : (s.court.pendingPose?.velocity ?? normalizedVelocity(b));
    this.arrow(
      s.shot.active ? projectShot(s.shot.pose!, rim) : this.project(b.position),
      velocity,
      0xffec61,
    );
    if (this.lastResponse && this.responsePoint)
      this.arrow(
        this.project(this.responsePoint),
        this.lastResponse.outgoing,
        0xff61cb,
      );
    const n = measured.nearest;
    this.text.setText([
      `PHYSICS AUDIT #${this.shotIndex} ${this.phase()}`,
      `t=${measured.ms.toFixed(1)} mask=${b.collisionFilter.mask === 0 ? "OFF" : "ON"} static=${b.isStatic} ${s.pass.stage}`,
      `R phys=${b.circleRadius.toFixed(1)} -> ${measured.matterRadiusScreen.toFixed(2)}px screen`,
      `R visual solid~${measured.visualSolidRadiusScreen.toFixed(2)}px; score=${measured.scoringRadiusLogical.toFixed(1)} logical`,
      `v60=(${velocity.x.toFixed(2)},${velocity.y.toFixed(2)})`,
      `nearest ${n?.label} body-gap=${n?.matterGapLogical.toFixed(2)} logical`,
      `prediction=${this.predicted?.impact ?? "none"}; response=${this.lastResponse?.origin ?? "none"}`,
      "ORANGE bodies | GREEN alpha silhouette | CYAN ball/SAT",
      "YELLOW target/current v | AMBER nearest surface",
      "PINK center/gate + REQUESTED v; PURPLE sensors",
      "WHITE hypothetical sweep (mask ignored)",
    ]);
  }
}
