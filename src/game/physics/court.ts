import { physics } from "../../data/physics";
import Phaser from "phaser";
import type { LevelConfig } from "../../data/levels";
export const BALL_RADIUS = physics.ballRadius;
export const ORIGIN = physics.origin;
export const STEP_MS = physics.stepMs;
export class MatterCourt {
  readonly ball: Phaser.Physics.Matter.Image;
  readonly rim: Phaser.GameObjects.Graphics;
  private net: Phaser.GameObjects.Graphics;
  constructor(
    private scene: Phaser.Scene,
    readonly level: LevelConfig,
  ) {
    scene.matter.world.autoUpdate = false;
    scene.matter.world.setGravity(0, 1, physics.gravity);
    const { hoopX: x, hoopY: y } = level;
    const body = scene.matter.add;
    body.rectangle(200, 700, 600, 25, {
      isStatic: true,
      label: "ground",
      restitution: 0.65,
    });
    body.rectangle(x + 51, y - 34, 8, 92, {
      isStatic: true,
      label: "backboard",
      restitution: 0.7,
    });
    body.circle(x - 42, y, 4, {
      isStatic: true,
      label: "rim",
      restitution: 0.55,
    });
    body.circle(x + 42, y, 4, {
      isStatic: true,
      label: "rim",
      restitution: 0.55,
    });
    const g = scene.add.graphics();
    g.lineStyle(8, 0x415963);
    g.lineBetween(x + 56, y + 10, x + 56, 440);
    g.fillStyle(0xa4c8c7, 0.08);
    g.fillRoundedRect(x + 44, y - 81, 12, 95, 3);
    g.lineStyle(2, 0xb4d8d0, 0.8);
    g.strokeRoundedRect(x + 44, y - 81, 12, 95, 3);
    g.lineStyle(3, 0xf4a06b);
    g.lineBetween(x + 46, y - 30, x + 46, y - 4);
    this.net = scene.add.graphics();
    this.drawNet();
    this.rim = scene.add.graphics();
    this.rim.lineStyle(5, 0xef9e70);
    this.rim.lineBetween(x - 42, y, x + 42, y);
    this.rim.setDepth(3);
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
  private drawNet() {
    const { hoopX: x, hoopY: y } = this.level;
    const g = this.net;
    g.clear();
    g.lineStyle(1.3, 0xc0d9cb, 0.5);
    for (let i = 0; i < 7; i++) {
      const top = x - 39 + i * 13,
        bottom = x - 24 + i * 8;
      g.lineBetween(top, y + 4, bottom, y + 46);
      if (i < 6) {
        g.lineBetween(top, y + 4, bottom + 8, y + 46);
        g.lineBetween(top + 13, y + 4, bottom, y + 46);
      }
    }
    g.lineBetween(x - 24, y + 46, x + 24, y + 46);
  }
  step() {
    this.scene.matter.world.step(STEP_MS);
  }
  reset() {
    this.ball.setStatic(true);
    this.ball.setPosition(ORIGIN.x, ORIGIN.y);
    this.ball.setVelocity(0, 0);
    this.ball.setAngularVelocity(0);
    this.ball.setAngle(0);
  }
  launch(v: { x: number; y: number }) {
    this.ball.setStatic(false);
    this.ball.setVelocity(v.x, v.y);
    this.ball.setAngularVelocity(v.x * 0.025);
  }
  react() {
    this.scene.tweens.add({
      targets: this.net,
      alpha: 0.2,
      duration: 90,
      yoyo: true,
      repeat: 2,
    });
  }
  destroy() {
    this.ball.destroy();
  }
}
