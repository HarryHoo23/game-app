import { physics } from "../../data/physics";
import { AimGuide } from "../effects/AimGuide";
import Phaser from "phaser";
import { ORIGIN } from "../physics/court";
import { launchVector } from "../../domain/shooting/launch";
import type { Stats } from "../../domain/progression/progress";
export class ShotInput {
  private pointer: number | null = null;
  private start = { x: 0, y: 0 };
  private drag = { x: 0, y: 0 };
  private preview: AimGuide;
  constructor(
    private scene: Phaser.Scene,
    private stats: Stats,
    private canAim: () => boolean,
    private fire: (v: { x: number; y: number }) => void,
  ) {
    this.preview = new AimGuide(scene);
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
      Math.hypot(p.x - ORIGIN.x, p.y - ORIGIN.y) > physics.inputRadius
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
    const v = launchVector(this.drag.x, this.drag.y, this.stats);
    this.cancel();
    if (v && this.canAim()) this.fire(v);
  }
  get isAiming() {
    return this.pointer !== null;
  }
  cancel = () => {
    this.pointer = null;
    this.preview.clear();
  };
  private draw() {
    this.preview.clear();
    const v = launchVector(this.drag.x, this.drag.y, this.stats);
    if (v) this.preview.draw(v);
  }
}
