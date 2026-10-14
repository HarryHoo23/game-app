import Phaser from "phaser";
import type { AppContext } from "../../app/context";
export class AppScene extends Phaser.Scene {
  get app(): AppContext {
    return this.registry.get("app") as AppContext;
  }
}
