import { physics } from "../../data/physics";
import { TrajectoryPreview } from "../effects/TrajectoryPreview";
import {
  createShot,
  type ShotPlan,
} from "../../domain/shooting/ShotTrajectory";
import type { LevelConfig } from "../../data/levels";
import Phaser from "phaser";
import { PERSPECTIVE_CONFIG } from "../presentation/perspective";
import type { Stats } from "../../domain/progression/progress";
export class ShotInput {
  private pointer: number | null = null;
  private start = { x: 0, y: 0 };
  private drag = { x: 0, y: 0 };
  private preview: TrajectoryPreview;
  private predicted: ShotPlan | null = null;
  constructor(
    private scene: Phaser.Scene,
    private stats: Stats,
    private level: LevelConfig,
    private canAim: () => boolean,
    private fire: (plan: ShotPlan) => void,
  ) {
    this.preview = new TrajectoryPreview(scene, {
      x: level.hoopX,
      y: level.hoopY,
    });
    scene.input.on("pointerdown", this.down, this);
    scene.input.on("pointermove", this.move, this);
    scene.input.on("pointerup", this.up, this);
    scene.input.on("pointerupoutside", this.cancel, this);
    scene.game.canvas.addEventListener("pointercancel", this.cancel);
    scene.events.once("shutdown", () => {
      scene.input.off("pointerdown", this.down, this);
      scene.input.off("pointermove", this.move, this);
      scene.input.off("pointerup", this.up, this);
      scene.input.off("pointerupoutside", this.cancel, this);
      scene.game.canvas.removeEventListener("pointercancel", this.cancel);
    });
  }
  private down(p: Phaser.Input.Pointer) {
    if (
      !this.canAim() ||
      this.pointer !== null ||
      Math.hypot(p.x - physics.origin.x, p.y - PERSPECTIVE_CONFIG.idleBallY) >
        physics.inputRadius
    )
      return;
    this.pointer = p.id;
    this.start = { x: p.x, y: p.y };
    this.drag = { x: 0, y: 0 };
  }
  private move(p: Phaser.Input.Pointer) {
    if (p.id !== this.pointer) return;
    const k = 1 - this.stats.smoothing;
    this.drag.x += (p.x - this.start.x - this.drag.x) * k;
    this.drag.y += (p.y - this.start.y - this.drag.y) * k;
    this.draw();
  }
  private up(p: Phaser.Input.Pointer) {
    if (p.id !== this.pointer) return;
    this.move(p);
    const plan = createShot(this.drag.x, this.drag.y, this.level, this.stats);
    this.cancel();
    if (plan && this.canAim()) this.fire(plan);
  }
  get aimPower() {
    return this.predicted?.power ?? 0;
  }
  get isAiming() {
    return this.pointer !== null;
  }
  cancel = () => {
    this.pointer = null;
    this.predicted = null;
    this.preview.clear();
  };
  private draw() {
    this.preview.clear();
    const plan = createShot(this.drag.x, this.drag.y, this.level, this.stats);
    this.predicted = plan;
    if (plan) this.preview.draw(plan);
  }
}
