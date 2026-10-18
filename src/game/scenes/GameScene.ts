import { MissContact } from "../../domain/shooting/ImpactResponse";
import { readyDelay } from "../../data/impactFeel";
import { rimOnScreen } from "../presentation/perspective";
import { HoopPass } from "../hoop/HoopPass";
import { HoopRenderer } from "../hoop/HoopRenderer";
import { ShotController } from "../../domain/shooting/ShotController";
import {
  assessShot,
  type ShotPlan,
  type ShotPose,
  type ShotImpact,
} from "../../domain/shooting/ShotTrajectory";
import { createCourtEnvironment } from "../environments/NightCourt";
import { BallAnimator } from "../environments/BallAnimator";
import { GameHud } from "../ui/GameHud";
import { theme } from "../themes/theme";
import Phaser from "phaser";
import { AppScene } from "./base";
import { levels } from "../../data/levels";
import { LevelSession } from "../../domain/levels/session";
import { calculateStats, type Stats } from "../../domain/progression/progress";
import { MatterCourt, STEP_MS } from "../physics/court";
import { ShotInput } from "../input/shotInput";
import { finalizeInputShot, finishInputImpact } from "../input/inputDebug";
import { Feedback } from "../systems/feedback";
import { on } from "../ui/screen";
import { PhysicsAudit } from "../debug/PhysicsAudit";
export class GameScene extends AppScene {
  private audit?: PhysicsAudit;
  private levelId = 1;
  private session!: LevelSession;
  private physicsCourt!: MatterCourt;
  private hoop!: HoopRenderer;
  private pass!: HoopPass;
  private candidateScore = 0;
  private resultScore = 0;
  private resultImpact: ShotImpact = "none";
  private miss: MissContact | null = null;
  private awaitingMissHandoff = false;
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
    if (import.meta.env.DEV) this.audit = undefined;
    this.levelId = data.levelId ?? 1;
    this.accumulator = 0;
    this.shot.reset();
    this.miss = null;
    this.awaitingMissHandoff = false;
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
    this.ballView = new BallAnimator(this, this.physicsCourt.ball, this.hoop);
    if (
      import.meta.env.DEV &&
      new URLSearchParams(location.search).has("debugPhysics")
    )
      this.audit = new PhysicsAudit(this, () => ({
        court: this.physicsCourt,
        hoop: this.hoop,
        shot: this.shot,
        pass: this.pass,
        image: this.ballView.image,
        level: l,
        stats: this.stats,
        settled: this.settled,
        score: this.session.score,
      }));
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
      const handled = new Set<number>();
      for (const pair of event.pairs) {
        const a = pair.bodyA.label,
          b = pair.bodyB.label;
        if (a !== "ball" && b !== "ball") continue;
        const other = a === "ball" ? b : a;
        if (this.miss && (other === "rim" || other === "backboard")) {
          const part = a === "ball" ? pair.bodyB : pair.bodyA;
          const parent = part.parent;
          if (handled.has(parent.id)) continue;
          handled.add(parent.id);
          // Secondary physical bounces remain part of this miss's presentation window.
          if (this.settled) {
            this.impact(other);
            continue;
          }
          const contact = this.miss.collide(other, part.plugin?.rimArc);
          if (contact) {
            if (import.meta.env.DEV)
              this.audit?.event("collision-gate", { contact });
            this.respondToMiss(contact);
            this.resolve(0);
          }
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
  private launch(plan: ShotPlan) {
    if (!this.session.launch()) return;
    this.shot.launch(plan);
    this.feedback.release();
    this.resultImpact = "none";
    this.miss = null;
    this.awaitingMissHandoff = false;
    this.settled = false;
    this.physicsCourt.beginControlled(
      plan,
      assessShot(plan, this.session.config, this.stats),
    );
    if (import.meta.env.DEV) this.audit?.event("launch", { plan });
    this.hint.setText("");
    this.renderHud();
  }
  private resolve(score: number) {
    if (this.settled || !this.session.inFlight) return;
    this.session.resolve(score);
    if (import.meta.env.DEV) this.audit?.event("resolve", { awarded: score });
    this.resultScore = score;
    if (import.meta.env.DEV && this.shot.currentPlan)
      finalizeInputShot(this.shot.currentPlan, {
        made: score > 0,
        score,
        impact: this.resultImpact,
        quality:
          score === 4
            ? "perfect"
            : score === 3
              ? "swish"
              : score
                ? "normal"
                : "miss",
      });
    this.settled = true;
    this.settling = 0;
    if (score) {
      const rim = rimOnScreen(this.hoop.getRimCenter());
      this.feedback.basket(rim.x, rim.y, score, this.session.streak);
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
      const passWasActive = this.pass.active;
      const pendingWasActive = this.physicsCourt.pendingPose !== null;
      this.physicsCourt.step();
      if (pendingWasActive) {
        const handoff = this.physicsCourt.advancePending(STEP_MS);
        if (handoff.released && this.awaitingMissHandoff) {
          this.awaitingMissHandoff = false;
          this.observeMiss(handoff.pose);
        }
      }
      if (this.shot.active) {
        const previousT = this.shot.pose!.t;
        const { pose, arrived } = this.shot.advance(STEP_MS);
        if (pose) {
          const result = assessShot(
            this.shot.currentPlan!,
            this.session.config,
            this.stats,
          );
          const contact = !result.made
            ? this.physicsCourt.findMissContact(
                this.shot.currentPlan!,
                previousT,
                pose.t,
              )
            : null;
          if (arrived || contact) {
            this.candidateScore = result.score;
            // Arrival quality can still be a normal make, but is not evidence
            // of a physical rim collision. Only Matter records actual contact.
            this.resultImpact = result.made ? "none" : result.impact;
            if (import.meta.env.DEV)
              this.audit?.event("prediction", { result });
          }
          if (contact) {
            this.shot.finishAt(contact.progress);
            this.beginMissHandoff(contact.pose);
          } else {
            this.physicsCourt.placeControlled(pose);
            if (arrived && !this.pass.start(this.shot.currentPlan!, result))
              this.beginMissHandoff(pose);
          }
        }
      }
      if (passWasActive && this.pass.active) {
        const event = this.pass.advance(STEP_MS);
        if (event.pose) this.physicsCourt.placeControlled(event.pose);
        if (event.entered) {
          if (this.pass.contacts.rim) {
            if (import.meta.env.DEV)
              this.audit?.event("candidate-rim-feedback");
            this.impact("rim");
          }
          const rim = rimOnScreen(this.hoop.getRimCenter());
          this.hoop.playNetSwish(
            this.candidateScore >= 3,
            this.candidateScore === 4,
          );
          this.feedback.entry(rim.x, rim.y, this.candidateScore);
        }
        if (event.finished && event.pose) {
          this.hoop.releaseNet();
          this.physicsCourt.finishControlled(event.pose);
          if (import.meta.env.DEV)
            this.audit?.event("handoff", { path: "exit", pose: event.pose });
          const contacted =
            this.pass.contacts.rim || this.pass.contacts.backboard;
          this.resolve(
            event.scored ? (contacted ? 2 : this.candidateScore) : 0,
          );
        }
      }
      if (this.miss && !this.settled) {
        const event = this.miss.advance(STEP_MS, this.physicsCourt.ball);
        if (event.resolve) this.resolve(0);
      }
      if (this.settled) {
        this.settling += STEP_MS;
        if (this.settling >= readyDelay(this.resultScore)) {
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
          if (import.meta.env.DEV) this.audit?.event("reset");
          this.shot.reset();
          this.pass.reset();
          this.miss = null;
          this.awaitingMissHandoff = false;
          this.settled = false;
          this.hint.setText("DRAG UP\nTO SHOOT");
        }
      }
      if (import.meta.env.DEV) this.audit?.sampleStep();
    }
    if (this.shot.active && this.shot.pose)
      this.ballView.flight(this.shot.pose, this.shot.elapsedMs);
    else if (this.pass.active && this.pass.pose)
      this.ballView.flight(
        this.pass.pose,
        this.shot.elapsedMs + this.pass.elapsedMs,
        this.pass.stage,
      );
    else if (this.physicsCourt.pendingPose)
      this.ballView.flight(
        this.physicsCourt.pendingPose,
        this.shot.elapsedMs + this.physicsCourt.pendingElapsedMs,
      );
    else if (this.settled || this.miss)
      this.ballView.rebound(this.pass.pose?.scale ?? this.shot.pose!.scale);
    else this.ballView.idle(this.aim.isAiming ? this.aim.aimPower : 0);
    this.hoop.drawDebug(this.ballView.image);
  }
  private beginMissHandoff(pose: ShotPose) {
    if (this.physicsCourt.finishControlled(pose)) this.observeMiss(pose);
    else {
      this.awaitingMissHandoff = true;
      if (import.meta.env.DEV) this.audit?.event("handoff-deferred", { pose });
    }
  }
  private observeMiss(pose: ShotPose) {
    this.miss = new MissContact(
      this.resultImpact,
      this.hoop.getRimCenter(),
      this.physicsCourt.observationBounds,
    );
    if (import.meta.env.DEV)
      this.audit?.event("handoff", {
        path: "miss",
        pose,
        deferredMs: this.physicsCourt.pendingElapsedMs,
      });
  }
  private respondToMiss(impact: ShotImpact) {
    this.resultImpact = impact;
    if (import.meta.env.DEV && this.shot.currentPlan)
      finishInputImpact(this.shot.currentPlan, impact);
    // Both arc and board impulses belong exclusively to Matter's solver.
    if (import.meta.env.DEV) this.audit?.event("engine-response", { impact });
    this.impact(impact === "backboard" ? "backboard" : "rim");
  }
  private impact(kind: "rim" | "backboard") {
    if (import.meta.env.DEV) this.audit?.event("feedback-impact", { kind });
    if (import.meta.env.DEV && this.shot.currentPlan)
      finishInputImpact(
        this.shot.currentPlan,
        kind === "backboard"
          ? "backboard"
          : this.resultImpact === "frontRim" || this.resultImpact === "backRim"
            ? this.resultImpact
            : this.physicsCourt.ball.y >= this.hoop.getRimCenter().y
              ? "frontRim"
              : "backRim",
      );
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
