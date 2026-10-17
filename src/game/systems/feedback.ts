import { showScoreFeedback } from "../effects/ScoreFeedback";
import Phaser from "phaser";
import type { AppContext } from "../../app/context";
import { feedbackFeel } from "../../data/feedbackFeel";
export class Feedback {
  private reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    .matches;
  constructor(
    private scene: Phaser.Scene,
    private app: AppContext,
  ) {}
  rim(backboard = false) {
    if (!this.reduced)
      this.scene.cameras.main.shake(
        feedbackFeel.camera.rimShakeMs,
        feedbackFeel.camera.rimShakeStrength,
      );
    this.app.audio.play(backboard ? "backboard" : "rim");
    this.app.haptics.pulse("rim");
  }
  release() {
    this.app.audio.play("release");
  }
  /** Entry presentation never awards points or invokes score callbacks. */
  entry(_x: number, _y: number, score: number) {
    this.app.audio.play(
      score === 4 ? "perfect" : score === 3 ? "swish" : "basket",
    );
    if (this.reduced) return;
    const camera = this.scene.cameras.main,
      feel = feedbackFeel.camera;
    this.scene.tweens.killTweensOf(camera);
    camera.setZoom(1);
    this.scene.tweens.add({
      targets: camera,
      zoom:
        score === 4
          ? feel.perfectPunch
          : score === 3
            ? feel.swishPunch
            : feel.rimMakePunch,
      duration: feel.durationMs / 2,
      yoyo: true,
      ease: "Sine.easeInOut",
      onComplete: () => camera.setZoom(1),
    });
  }
  /** EXIT commits the visible result; entry audio and camera are not repeated. */
  basket(x: number, y: number, score: number, streak: number) {
    showScoreFeedback(this.scene, x, y, score, streak, this.reduced);
    this.app.haptics.pulse(score === 4 ? "perfect" : "basket");
    if (score >= 3 && !this.reduced) {
      const emitter = this.scene.add
        .particles(x, y, "spark", {
          speed: { min: 30, max: 120 },
          angle: { min: 210, max: 330 },
          lifespan: 500,
          gravityY: 130,
          scale: { start: 0.65, end: 0 },
          emitting: false,
        })
        .setDepth(feedbackFeel.particles.depth);
      emitter.explode(
        score === 4
          ? feedbackFeel.particles.perfectCount
          : feedbackFeel.particles.swishCount,
      );
      this.scene.time.delayedCall(650, () => emitter.destroy());
    }
  }
}
