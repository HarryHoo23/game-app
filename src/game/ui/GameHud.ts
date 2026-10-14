import Phaser from "phaser";
import { screen } from "./screen";
import { coinDisplay, statDisplay, progressBar } from "./components";
import { icon } from "./icons";
import type { LevelSession } from "../../domain/levels/session";
export class GameHud {
  readonly element: HTMLElement;
  private reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    .matches;
  constructor(scene: Phaser.Scene, session: LevelSession, coins: number) {
    const l = session.config;
    this.element = screen(
      scene,
      `<header class="game-top"><div class="court-meta"><span class="eyebrow">COURT ${String(l.id).padStart(2, "0")} <span>/ 10</span></span><div class="court-segments" aria-label="Court ${l.id} of 10">${Array.from({ length: 10 }, (_, i) => `<i class="${i < l.id ? "active" : ""}"></i>`).join("")}</div></div><button class="icon-button" data-pause aria-label="Pause">${icon("pause")}</button>${coinDisplay(coins)}</header>
<div class="scoreboard">${statDisplay("SCORE", 0, "data-score", "score-panel")}${statDisplay("TARGET", l.targetScore, "", "target")}${statDisplay("SHOTS LEFT", l.totalShots, "data-shots", "shots-panel")}<div class="hud-panel combo-panel"><div class="combo-value">${icon("ball")}<strong data-combo>×0</strong></div><span class="stat-label">COMBO</span></div></div>${progressBar()}
<div class="game-caption"><span>PUBLIC COURT / AFTER HOURS</span><span>ONE MORE SHOT. ${icon("arrow")}</span></div><div data-modal></div>`,
      "screen game-hud",
    );
  }
  update(session: LevelSession) {
    const score = this.element.querySelector<HTMLElement>("[data-score]")!;
    if (score.textContent !== String(session.score) && !this.reduced)
      score.animate(
        [
          { transform: "translateY(3px)", opacity: 0.65 },
          { transform: "translateY(0)", opacity: 1 },
        ],
        { duration: 220, easing: "ease-out" },
      );
    score.textContent = String(session.score);
    this.element.querySelector("[data-shots]")!.textContent = String(
      session.remaining,
    );
    this.element.querySelector("[data-combo]")!.textContent =
      `×${session.streak}`;
    this.element
      .querySelector(".combo-panel")!
      .classList.toggle("is-active", session.streak > 1);
    (this.element.querySelector("[data-progress]") as HTMLElement).style.width =
      `${Math.min(100, (session.score / session.config.targetScore) * 100)}%`;
  }
}
