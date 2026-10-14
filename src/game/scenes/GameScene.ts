import { HoopPass } from "../hoop/HoopPass";
import { HoopRenderer } from "../hoop/HoopRenderer";
import { ShotController } from "../../domain/shooting/ShotController";
import {
  assessShot,
  type ShotPlan,
} from "../../domain/shooting/ShotTrajectory";
import { createCourtEnvironment } from "../environments/NightCourt";
import { BallAnimator } from "../environments/BallAnimator";
import { GameHud } from "../ui/GameHud";
import { theme } from "../themes/theme";
import { physics } from "../../data/physics";
import Phaser from "phaser";
import { AppScene } from "./base";
import { levels } from "../../data/levels";
import { LevelSession } from "../../domain/levels/session";
import { calculateStats, type Stats } from "../../domain/progression/progress";
import { MatterCourt, STEP_MS } from "../physics/court";
import { ShotInput } from "../input/shotInput";
import { Feedback } from "../systems/feedback";
import { on } from "../ui/screen";
export class GameScene extends AppScene {
  private levelId = 1;
  private session!: LevelSession;
  private physicsCourt!: MatterCourt;
  private hoop!: HoopRenderer;
  private pass!: HoopPass;
  private candidateScore = 0;
  private shot = new ShotController();
  private stats!: Stats;
  private aim!: ShotInput;
  private feedback!: Feedback;
  private hud!: HTMLElement;
  private hudView!: GameHud;
  private ballView!: BallAnimator;
  private accumulator = 0;
  private settling = 0;
  private settled = false;
  private paused = false;
  private runId = "";
  private hint!: Phaser.GameObjects.Text;
  constructor() {
    super("Game");
  }
  init(data: { levelId?: number }) {
    this.levelId = data.levelId ?? 1;
    this.accumulator = 0;
    this.shot.reset();
    this.settling = 0;
    this.settled = false;
    this.paused = false;
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
    this.hoop = new HoopRenderer(this, l.hoopX, l.hoopY);
    this.pass = new HoopPass(l);
    this.ballView = new BallAnimator(this, this.physicsCourt.ball);
    this.feedback = new Feedback(this, this.app);
    this.hint = this.add
      .text(285, 566, "DRAG UP\nTO SHOOT", {
        fontFamily: "Barlow",
        fontSize: "10px",
        fontStyle: "bold",
        letterSpacing: 1.5,
        lineSpacing: 5,
        color: theme.colors.cream,
      })
      .setOrigin(0, 0.5);
    this.aim = new ShotInput(
      this,
      this.stats,
      l,
      () =>
        !this.paused &&
        !this.session.inFlight &&
        !this.settled &&
        !this.session.finished,
      (plan) => this.launch(plan),
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
        if (!this.shot.active && (other === "rim" || other === "backboard"))
          this.impact(other);
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
  private launch(plan: ShotPlan) {
    if (!this.session.launch()) return;
    this.shot.launch(plan);
    this.settled = false;
    this.physicsCourt.beginControlled();
    this.hint.setText("");
    this.renderHud();
  }
  private resolve(score: number) {
    if (this.settled || !this.session.inFlight) return;
    this.session.resolve(score);
    this.settled = true;
    this.settling = 0;
    if (score) {
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
      this.physicsCourt.step();
      if (this.shot.active) {
        const { pose, arrived } = this.shot.advance(STEP_MS);
        if (pose) this.physicsCourt.placeControlled(pose);
        if (arrived && pose) {
          const result = assessShot(
            this.shot.currentPlan!,
            this.session.config,
            this.stats,
          );
          this.candidateScore = result.score;
          if (!this.pass.start(this.shot.currentPlan!, result)) {
            this.physicsCourt.finishControlled(pose);
            if (result.impact !== "none" && result.impact !== "airball")
              this.impact(result.impact === "backboard" ? "backboard" : "rim");
            this.resolve(0);
          }
        }
      }
      if (this.pass.active) {
        const event = this.pass.advance(STEP_MS);
        if (event.pose) this.physicsCourt.placeControlled(event.pose);
        if (event.entered) {
          if (this.pass.contacts.rim) this.impact("rim");
          this.hoop.playNetSwish(this.candidateScore >= 3);
        }
        if (event.finished && event.pose) {
          this.physicsCourt.finishControlled(event.pose);
          const contacted =
            this.pass.contacts.rim || this.pass.contacts.backboard;
          this.resolve(
            event.scored ? (contacted ? 2 : this.candidateScore) : 0,
          );
        }
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
          this.hoop.reset();
          this.shot.reset();
          this.pass.reset();
          this.settled = false;
          this.hint.setText("DRAG UP\nTO SHOOT");
        }
      }
    }
    if (this.shot.active && this.shot.pose)
      this.ballView.flight(this.shot.pose, this.shot.elapsedMs);
    else if (this.pass.active && this.pass.pose)
      this.ballView.flight(
        this.pass.pose,
        this.shot.elapsedMs + this.pass.elapsedMs,
        this.pass.stage,
      );
    else if (this.settled)
      this.ballView.rebound(
        this.pass.pose?.scale ?? this.shot.currentPlan!.hoopScale,
      );
    else this.ballView.idle(this.aim.isAiming ? this.aim.aimPower : 0);
    this.hoop.drawDebug(this.ballView.image);
  }
  private impact(kind: "rim" | "backboard") {
    this.pass.sensors.touch(kind);
    if (kind === "rim") this.hoop.playRimHit();
    else this.hoop.playBackboardHit();
    this.feedback.rim(kind === "backboard");
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
