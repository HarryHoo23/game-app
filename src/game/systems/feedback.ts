import Phaser from "phaser";
import type { AppContext } from "../../app/context";
export class Feedback {
  private reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    .matches;
  constructor(
    private scene: Phaser.Scene,
    private app: AppContext,
  ) {}
  rim() {
    if (!this.reduced) this.scene.cameras.main.shake(70, 0.0015);
    this.app.audio.play("rim");
  }
  basket(x: number, y: number, score: number, streak: number) {
    const text = this.scene.add
      .text(
        x,
        y - 80,
        `${score === 4 ? "PERFECT" : score === 3 ? "SWISH" : "BUCKET"}!\n+${score}${streak > 1 ? `  ·  COMBO ×${streak}` : ""}`,
        {
          fontFamily: "Arial",
          fontStyle: "bold",
          fontSize: "23px",
          color: score === 4 ? "#b6f5d9" : "#fff0d9",
          align: "center",
        },
      )
      .setOrigin(0.5)
      .setDepth(20);
    this.scene.tweens.add({
      targets: text,
      y: y - 115,
      alpha: 0,
      duration: 1100,
      onComplete: () => text.destroy(),
    });
    this.app.audio.play(score === 4 ? "perfect" : "basket");
    this.app.haptics.pulse(score === 4 ? "perfect" : "basket");
    if (score >= 3 && !this.reduced) {
      const emitter = this.scene.add.particles(x, y, "spark", {
        speed: { min: 30, max: 120 },
        angle: { min: 210, max: 330 },
        lifespan: 500,
        gravityY: 130,
        scale: { start: 0.65, end: 0 },
        emitting: false,
      });
      emitter.explode(score === 4 ? 18 : 9);
      this.scene.time.delayedCall(650, () => emitter.destroy());
    }
  }
}
