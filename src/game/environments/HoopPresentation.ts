import Phaser from "phaser";
import { colorNumber } from "../themes/theme";
import { assets } from "../assets/manifest";
import { hoopLayout } from "../../data/hoop";
import type { LevelConfig } from "../../data/levels";
/** The supplied PNG is split at the rim into back/front layers for correct ball occlusion. */
export class HoopPresentation {
  readonly rim: Phaser.GameObjects.Image;
  readonly board: Phaser.GameObjects.Image;
  constructor(
    private scene: Phaser.Scene,
    level: LevelConfig,
  ) {
    const { hoopX: x, hoopY: y } = level;
    const support = scene.add.graphics().setDepth(0);
    support.lineStyle(12, colorNumber("ink"), 0.9);
    support.lineBetween(x, y + 83, x, 460);
    support.lineStyle(4, colorNumber("edge"), 0.8);
    support.lineBetween(x - 2, y + 83, x - 2, 460);
    const image = () =>
      scene.add
        .image(x, y, assets.hoop.key)
        .setOrigin(hoopLayout.rimAnchor.x, hoopLayout.rimAnchor.y)
        .setDisplaySize(hoopLayout.displayWidth, hoopLayout.displayWidth);
    this.board = image()
      .setCrop(0, 0, hoopLayout.textureSize, hoopLayout.frontTextureY)
      .setDepth(2);
    this.rim = image()
      .setCrop(
        0,
        hoopLayout.frontTextureY,
        hoopLayout.textureSize,
        hoopLayout.textureSize - hoopLayout.frontTextureY,
      )
      .setDepth(5);
  }
  react() {
    this.scene.tweens.add({
      targets: this.rim,
      y: this.rim.y + 2,
      duration: 90,
      yoyo: true,
      repeat: 2,
    });
  }
}
