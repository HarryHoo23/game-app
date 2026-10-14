import { assets } from "../assets/manifest";
import {
  createCourtEnvironment,
  createHomeBall,
} from "../environments/NightCourt";
import { homeScreen } from "../ui/HomeScreen";
import { AppScene } from "./base";
import { court, makeTextures } from "../systems/art";
import { screen, on, topbar, starText } from "../ui/screen";
import { levels } from "../../data/levels";
import {
  categories,
  equipment,
  upgradeCosts,
  type Category,
} from "../../data/equipment";
import { stars } from "../../domain/levels/session";
import type { LevelResult } from "../../domain/progression/progress";
export class BootScene extends AppScene {
  constructor() {
    super("Boot");
  }
  create() {
    this.scene.start("Preload");
  }
}
export class PreloadScene extends AppScene {
  constructor() {
    super("Preload");
  }
  preload() {
    this.load.image(assets.nightCourt.key, assets.nightCourt.url);
  }
  create() {
    makeTextures(this);
    // Canvas lettering must use the local fonts before its text textures are baked.
    void Promise.all([
      document.fonts.load('700 16px "Barlow"'),
      document.fonts.load('800 16px "Barlow Condensed"'),
      document.fonts.load('400 16px "Permanent Marker"'),
    ]).then(
      () => this.scene.start("MainMenu"),
      () => this.scene.start("MainMenu"),
    );
  }
}
export class MainMenuScene extends AppScene {
  constructor() {
    super("MainMenu");
  }
  create() {
    createCourtEnvironment(this, "home");
    createHomeBall(this);
    const p = this.app.progress;
    const el = screen(
      this,
      homeScreen(p, this.app.audio.enabled),
      "screen home",
    );
    on(el, "[data-play]", () =>
      this.scene.start("Game", { levelId: p.highestUnlockedLevel }),
    );
    on(el, "[data-levels]", () => this.scene.start("LevelSelect"));
    on(el, "[data-gear]", () => this.scene.start("Equipment"));
    on(el, "[data-sound]", () => {
      this.app.audio.enabled = !this.app.audio.enabled;
      el.querySelector("[data-sound-label]")!.textContent =
        `SOUND ${this.app.audio.enabled ? "ON" : "OFF"}`;
      if (this.app.audio.enabled) this.app.audio.play("basket");
    });
  }
}
export class LevelSelectScene extends AppScene {
  constructor() {
    super("LevelSelect");
  }
  create() {
    court(this);
    const p = this.app.progress;
    const count = Object.values(p.stars).reduce((a, b) => a + b, 0);
    const el = screen(
      this,
      `${topbar("THE NEIGHBORHOOD", p.coins)}<div class="page-heading"><span class="eyebrow mint">TEN COURTS. YOUR STORY.</span><h2>Find your<br><em>next shot.</em></h2><p>Play your way from first light to after hours.</p></div><div class="section-line"><span>COURT SELECT</span><span class="mint">★ ${count} / 30</span></div><div class="levels">${levels
        .map((l) => {
          const locked = l.id > p.highestUnlockedLevel;
          return `<button class="level ${locked ? "locked" : ""} ${l.id === p.highestUnlockedLevel ? "current" : ""}" data-level="${l.id}" ${locked ? "disabled" : ""}><span class="level-number">${String(l.id).padStart(2, "0")}</span><span class="level-name">${l.name}</span><span class="level-meta">${locked ? "LOCKED" : `${l.totalShots} SHOTS · ${l.targetScore} PTS`}</span><span class="level-stars">${locked ? "⌑" : starText(p.stars[l.id] ?? 0)}</span></button>`;
        })
        .join(
          "",
        )}</div><button class="secondary full" data-gear>Visit the locker room <span>↗</span></button>`,
      "screen scroll",
    );
    on(el, "[data-back]", () => this.scene.start("MainMenu"));
    on(el, "[data-gear]", () => this.scene.start("Equipment"));
    el.querySelectorAll<HTMLButtonElement>("[data-level]").forEach(
      (b) =>
        (b.onclick = () =>
          this.scene.start("Game", { levelId: Number(b.dataset.level) })),
    );
  }
}
export class EquipmentScene extends AppScene {
  constructor() {
    super("Equipment");
  }
  create() {
    court(this);
    this.render();
  }
  private render() {
    const p = this.app.progress;
    const el = screen(
      this,
      `${topbar("LOCKER ROOM", p.coins)}<div class="page-heading compact"><span class="eyebrow mint">SMALL EDGES. BIG FEELING.</span><h2>Your game.<br><em>Your gear.</em></h2><p>Better feel. The skill is still yours.</p></div><div class="player-strip"><span class="avatar">↗</span><div><strong>THE LOCAL</strong><small>Independent player / Court ${String(p.highestUnlockedLevel).padStart(2, "0")}</small></div></div><div class="equipment-list">${categories
        .map((c) => {
          const d = equipment[c],
            l = p.equipment[c],
            cost = upgradeCosts[l - 1];
          return `<article class="gear-card"><div class="gear-icon ${c}">${d.icon}</div><div class="gear-info"><span class="eyebrow">${d.category}</span><h3>${d.name}</h3><div class="gear-level">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= l ? "filled" : ""}"></i>`).join("")}<span>LV ${l}</span></div><p>${d.bonus(l)}</p><small>${l === 5 ? "Fully dialed in" : `NEXT · ${d.bonus(l + 1)}`}</small></div><button data-upgrade="${c}" class="upgrade" ${cost === undefined || p.coins < cost ? "disabled" : ""}>${cost === undefined ? "MAX" : `↑ <span>● ${cost}</span>`}</button></article>`;
        })
        .join(
          "",
        )}</div><div class="note">Earn coins on every completed run.<br>Upgrades improve feel. You make the shot.</div>`,
      "screen scroll",
    );
    on(el, "[data-back]", () => this.scene.start("LevelSelect"));
    el.querySelectorAll<HTMLButtonElement>("[data-upgrade]").forEach(
      (b) =>
        (b.onclick = () => {
          this.app.upgrade(b.dataset.upgrade as Category);
          this.render();
        }),
    );
  }
}
export class LevelResultScene extends AppScene {
  private result!: LevelResult;
  private earned = 0;
  constructor() {
    super("LevelResult");
  }
  init(data: { result: LevelResult; earned: number }) {
    this.result = data.result;
    this.earned = data.earned;
  }
  create() {
    court(this);
    const l = levels[this.result.levelId - 1],
      s = stars(this.result.score, l.targetScore),
      passed = s > 0;
    const el = screen(
      this,
      `${topbar("RUN COMPLETE", this.app.progress.coins)}<div class="result-content"><span class="eyebrow mint">COURT ${String(l.id).padStart(2, "0")} / ${l.name.toUpperCase()}</span><div class="result-symbol">${passed ? "↗" : "↻"}</div><h2>${passed ? "Made it.<br><em>Make it again.</em>" : "So close.<br><em>One more run.</em>"}</h2><div class="result-stars" aria-label="${s} stars">${starText(s)}</div><div class="result-score"><strong>${this.result.score}</strong><span>POINTS<br><small>TARGET ${l.targetScore}</small></span></div><div class="reward">${passed ? `<span>COINS EARNED</span><strong>● +${this.earned}</strong>` : "<span>A fresh set of shots. A fresh start.</span>"}</div></div><div class="result-actions"><button class="primary" data-next>${passed && l.id < 10 ? "Next court" : passed ? "Back to courts" : "Run it back"} <span>↗</span></button><div class="menu-row"><button class="secondary" data-retry>${passed ? "Play again" : "Back to levels"}</button><button class="secondary" data-gear>My equipment</button></div></div>`,
      "screen result",
    );
    on(el, "[data-back]", () => this.scene.start("LevelSelect"));
    on(el, "[data-next]", () => {
      if (passed && l.id === 10) this.scene.start("LevelSelect");
      else this.scene.start("Game", { levelId: passed ? l.id + 1 : l.id });
    });
    on(el, "[data-retry]", () =>
      passed
        ? this.scene.start("Game", { levelId: l.id })
        : this.scene.start("LevelSelect"),
    );
    on(el, "[data-gear]", () => this.scene.start("Equipment"));
  }
}
