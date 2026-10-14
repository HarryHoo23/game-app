import { createCourtEnvironment } from "../environments/NightCourt";
import { BallPresentation } from "../environments/BallPresentation";
import { GameHud } from "../ui/GameHud";
import { theme } from "../themes/theme";
import { physics } from "../../data/physics";
import { scoring } from "../../data/scoring";
import Phaser from "phaser";
import { AppScene } from "./base";
import { levels } from "../../data/levels";
import { LevelSession, points } from "../../domain/levels/session";
import { BasketDetector, type Vec } from "../../domain/scoring/basketDetector";
import { calculateStats, type Stats } from "../../domain/progression/progress";
import { MatterCourt, STEP_MS, BALL_RADIUS } from "../physics/court";
import { ShotInput } from "../input/shotInput";
import { Feedback } from "../systems/feedback";
import { on } from "../ui/screen";
export class GameScene extends AppScene {
  private levelId = 1;
  private session!: LevelSession;
  private physicsCourt!: MatterCourt;
  private detector!: BasketDetector;
  private stats!: Stats;
  private aim!: ShotInput;
  private feedback!: Feedback;
  private hud!: HTMLElement;
  private hudView!: GameHud;
  private ballView!: BallPresentation;
  private accumulator = 0;
  private elapsed = 0;
  private settling = 0;
  private contact = false;
  private settled = false;
  private paused = false;
  private runId = "";
  private lastRim = 0;
  private hint!: Phaser.GameObjects.Text;
  constructor() {
    super("Game");
  }
  init(data: { levelId?: number }) {
    this.levelId = data.levelId ?? 1;
    this.accumulator = 0;
    this.elapsed = 0;
    this.settling = 0;
    this.contact = false;
    this.settled = false;
    this.paused = false;
    this.lastRim = 0;
  }
  create() {
    if (
      !levels[this.levelId - 1] ||
      this.levelId > this.app.progress.highestUnlockedLevel
    ) {
      this.scene.start("LevelSelect");
      return;
    }
    const l = levels[this.levelId - 1];
    this.session = new LevelSession(l);
    this.stats = calculateStats(this.app.progress);
    this.runId = crypto.randomUUID();
    createCourtEnvironment(this, "game");
    this.physicsCourt = new MatterCourt(this, l);
    this.ballView = new BallPresentation(this, this.physicsCourt.ball, l.hoopY);
    this.feedback = new Feedback(this, this.app);
    this.resetDetector();
    this.hint = this.add
      .text(220, 604, "DRAG UP\nTO SHOOT", {
        fontFamily: "Barlow",
        fontSize: "11px",
        fontStyle: "bold",
        letterSpacing: 1.5,
        lineSpacing: 5,
        color: theme.colors.cream,
      })
      .setOrigin(0, 0.5);
    this.aim = new ShotInput(
      this,
      this.stats,
      () =>
        !this.paused &&
        !this.session.inFlight &&
        !this.settled &&
        !this.session.finished,
      (v) => this.launch(v),
    );
    this.hudView = new GameHud(this, this.session, this.app.progress.coins);
    this.hud = this.hudView.element;
    on(this.hud, "[data-pause]", () => this.pause());
    const collision = (
      event: Phaser.Physics.Matter.Events.CollisionStartEvent,
    ) => {
      for (const pair of event.pairs) {
        const a = pair.bodyA.label,
          b = pair.bodyB.label;
        if (a !== "ball" && b !== "ball") continue;
        const other = a === "ball" ? b : a;
        if (other === "rim" || other === "backboard") {
          this.contact = true;
          if (this.elapsed - this.lastRim > 100) {
            this.feedback.rim();
            this.lastRim = this.elapsed;
          }
        }
        if (other === "ground" && this.session.inFlight && !this.settled) {
          this.detector.invalidate();
          this.resolve(0);
        }
      }
    };
    const world = this.matter.world;
    world.on("collisionstart", collision);
    const visibility = () => {
      if (document.hidden) this.pause();
    };
    const blur = () => this.pause();
    const cancel = () => this.aim.cancel();
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", blur);
    window.addEventListener("resize", cancel);
    const escape = () => (this.paused ? this.resume() : this.pause());
    this.input.keyboard?.on("keydown-ESC", escape);
    this.events.once("shutdown", () => {
      world.off("collisionstart", collision);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", blur);
      window.removeEventListener("resize", cancel);
      this.input.keyboard?.off("keydown-ESC", escape);
    });
  }
  private resetDetector() {
    const l = levels[this.levelId - 1];
    this.detector = new BasketDetector(l.hoopX, l.hoopY, 38, BALL_RADIUS);
  }
  private launch(v: Vec) {
    if (!this.session.launch()) return;
    this.contact = false;
    this.elapsed = 0;
    this.lastRim = -200;
    this.settled = false;
    this.resetDetector();
    this.physicsCourt.launch(v);
    this.hint.setText("");
    this.renderHud();
  }
  private resolve(score: number) {
    if (this.settled || !this.session.inFlight) return;
    this.session.resolve(score);
    this.settled = true;
    this.settling = 0;
    if (score) {
      this.physicsCourt.react();
      this.feedback.basket(
        this.physicsCourt.level.hoopX,
        this.physicsCourt.level.hoopY,
        score,
        this.session.streak,
      );
      this.hint.setText(
        this.session.score >= this.session.config.targetScore
          ? "TARGET REACHED\nCHASE THE STARS"
          : "NICE SHOT.\nONE MORE.",
      );
    } else {
      this.hint.setText("RESET. BREATHE.\nNEXT SHOT.");
    }
    this.renderHud();
  }
  private renderHud() {
    this.hudView.update(this.session);
  }
  update(_time: number, delta: number) {
    if (!this.physicsCourt || this.paused) return;
    this.accumulator += Math.min(delta, 80);
    let steps = 0;
    while (this.accumulator >= STEP_MS && steps++ < 10) {
      this.accumulator -= STEP_MS;
      const ball = this.physicsCourt.ball;
      const previous = { x: ball.x, y: ball.y };
      this.physicsCourt.step();
      if (this.session.inFlight && !this.settled) {
        this.elapsed += STEP_MS;
        const current = { x: ball.x, y: ball.y };
        if (this.detector.sample(previous, current)) {
          const body = ball.body as MatterJS.BodyType;
          const perfect =
            Math.abs(ball.x - this.session.config.hoopX) <=
              this.stats.perfectTolerance &&
            Math.abs(body.velocity.x) <
              Math.abs(body.velocity.y) * scoring.perfectMaxHorizontalRatio;
          this.resolve(points(this.contact, perfect));
        } else if (
          this.elapsed > physics.shotTimeout ||
          ball.x < -70 ||
          ball.x > 470 ||
          ball.y > 735
        )
          this.resolve(0);
      }
      if (this.settled) {
        this.settling += STEP_MS;
        if (this.settling >= physics.resetDelay) {
          if (this.session.finished) {
            const result = {
              runId: this.runId,
              levelId: this.levelId,
              score: this.session.score,
            };
            const earned = this.app.complete(result);
            this.scene.start("LevelResult", { result, earned });
            return;
          }
          this.physicsCourt.reset();
          this.settled = false;
          this.hint.setText("DRAG UP\nTO SHOOT");
        }
      }
    }
    this.ballView.sync(this.session.inFlight || this.settled);
  }
  private pause() {
    if (this.paused || !this.hud) return;
    this.paused = true;
    this.accumulator = 0;
    this.aim.cancel();
    this.tweens.pauseAll();
    this.time.paused = true;
    const modal = this.hud.querySelector<HTMLElement>("[data-modal]")!;
    modal.innerHTML = `<div class="modal-backdrop"><div class="pause-card"><span class="eyebrow mint">TAKE A BREATHER</span><h2>Court's<br><em>on hold.</em></h2><button class="primary" data-resume>Keep playing <span>↗</span></button><button class="secondary full" data-retry>Restart level</button><button class="text-button" data-levels>Back to levels</button><button class="text-button" data-sound>Sound ${this.app.audio.enabled ? "on" : "off"}</button></div></div>`;
    on(modal, "[data-resume]", () => this.resume());
    on(modal, "[data-retry]", () => {
      this.time.paused = false;
      this.scene.restart({ levelId: this.levelId });
    });
    on(modal, "[data-levels]", () => {
      this.time.paused = false;
      this.scene.start("LevelSelect");
    });
    on(modal, "[data-sound]", () => {
      this.app.audio.enabled = !this.app.audio.enabled;
      modal.querySelector("[data-sound]")!.textContent =
        `Sound ${this.app.audio.enabled ? "on" : "off"}`;
    });
  }
  private resume() {
    this.paused = false;
    this.accumulator = 0;
    this.time.paused = false;
    this.tweens.resumeAll();
    this.hud.querySelector("[data-modal]")!.innerHTML = "";
  }
}
