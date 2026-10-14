import "@fontsource/barlow/latin-400.css";
import "@fontsource/barlow/latin-600.css";
import "@fontsource/barlow/latin-700.css";
import "@fontsource/barlow-condensed/latin-800.css";
import Phaser from "phaser";
import { AppContext } from "./app/context";
import {
  BootScene,
  PreloadScene,
  MainMenuScene,
  LevelSelectScene,
  EquipmentScene,
  LevelResultScene,
} from "./game/scenes/menus";
import { GameScene } from "./game/scenes/GameScene";
import "./game/ui/styles.css";
const app = new AppContext();
export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 400,
  height: 712,
  backgroundColor: "#142831",
  antialias: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: "matter",
    matter: { gravity: { x: 0, y: 1 }, enableSleeping: false, debug: false },
  },
  input: { activePointers: 2 },
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    LevelSelectScene,
    GameScene,
    LevelResultScene,
    EquipmentScene,
  ],
  callbacks: { preBoot: (game) => game.registry.set("app", app) },
});

// Read-only inspection surface for local physics tuning; excluded from production.
if (import.meta.env.DEV && new URLSearchParams(location.search).has("debug")) {
  Object.assign(window, { afterHours: game });
}
