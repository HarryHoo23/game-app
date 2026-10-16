import Phaser from "phaser";
import { PERSPECTIVE_CONFIG, rimOnScreen } from "../presentation/perspective";
import { hoopLayout, type HoopLayer } from "./hoopLayout";
import { assets } from "../assets/manifest";
import { colorNumber } from "../themes/theme";
/** Four independently anchored sprites; animation resets use their own baseline transforms. */
export class HoopRenderer {
  readonly container: Phaser.GameObjects.Container;
  readonly backboard: Phaser.GameObjects.Image;
  readonly rimBack: Phaser.GameObjects.Image;
  readonly net: Phaser.GameObjects.Image;
  readonly rimFront: Phaser.GameObjects.Image;
  private x: number;
  private y: number;
  private assemblyScale: number = PERSPECTIVE_CONFIG.hoopScale;
  private baseline = new Map<
    Phaser.GameObjects.Image,
    { x: number; y: number; scaleX: number; scaleY: number }
  >();
  private debug?: Phaser.GameObjects.Graphics;
  constructor(
    private scene: Phaser.Scene,
    x: number,
    y: number,
  ) {
    this.x = x;
    this.y = y;
    this.container = scene.add.container().setDepth(4);
    const create = (name: HoopLayer) => {
      const l = hoopLayout.layers[name],
        texture = scene.textures.get(assets.hoop[name].key);
      if (!texture.has("aligned"))
        texture.add(
          "aligned",
          0,
          l.frame.x,
          l.frame.y,
          l.frame.width,
          l.frame.height,
        );
      const image = scene.add
        .image(0, 0, assets.hoop[name].key, "aligned")
        .setOrigin(l.originX, l.originY)
        .setFlipY(l.flipY)
        .setDepth(l.depth)
        .setTint(PERSPECTIVE_CONFIG.tint[name]);
      this.container.add(image);
      return image;
    };
    this.backboard = create("backboard");
    this.rimBack = create("rimBack");
    this.net = create("net");
    this.rimFront = create("rimFront");
    this.applyLayout();
    if (
      import.meta.env.DEV &&
      new URLSearchParams(location.search).has("debugHoop")
    )
      this.debug = scene.add.graphics().setDepth(30);
    this.drawDebug();
  }
  private applyLayout() {
    const position = rimOnScreen(this.getRimCenter());
    this.container
      .setPosition(position.x, position.y)
      .setScale(this.assemblyScale);
    for (const name of Object.keys(hoopLayout.layers) as HoopLayer[]) {
      const l = hoopLayout.layers[name],
        image = this[name],
        scale = l.width / l.frame.width;
      image.setPosition(l.offsetX, l.offsetY).setScale(scale).setRotation(0);
      this.baseline.set(image, {
        x: image.x,
        y: image.y,
        scaleX: image.scaleX,
        scaleY: image.scaleY,
      });
    }
  }
  /** Insert the ball in the same display list so front-rim/net occlusion survives grouping. */
  placeBall(
    image: Phaser.GameObjects.Image,
    position: { x: number; y: number },
    width: number,
    height: number,
    depth: number,
  ) {
    if (image.parentContainer !== this.container) this.container.add(image);
    const local = this.container.getLocalPoint(position.x, position.y);
    image
      .setPosition(local.x, local.y)
      .setDisplaySize(width / this.assemblyScale, height / this.assemblyScale)
      .setDepth(depth);
    this.container.sort("depth");
  }
  setPosition(x: number, y: number) {
    this.reset();
    this.x = x;
    this.y = y;
    this.applyLayout();
    this.drawDebug();
    return this;
  }
  setScale(scale: number) {
    this.reset();
    this.assemblyScale = scale;
    this.applyLayout();
    this.drawDebug();
    return this;
  }
  getRimCenter() {
    return { x: this.x, y: this.y };
  }
  getRimBounds() {
    return {
      x: this.x - (hoopLayout.rimWidth * this.assemblyScale) / 2,
      y: this.y - 10 * this.assemblyScale,
      width: hoopLayout.rimWidth * this.assemblyScale,
      height: 20 * this.assemblyScale,
    };
  }
  private restore(image: Phaser.GameObjects.Image) {
    const base = this.baseline.get(image)!;
    image
      .setPosition(base.x, base.y)
      .setScale(base.scaleX, base.scaleY)
      .setRotation(0);
  }
  reset() {
    for (const image of [
      this.backboard,
      this.rimBack,
      this.net,
      this.rimFront,
    ]) {
      this.scene.tweens.killTweensOf(image);
      this.restore(image);
    }
    this.drawDebug();
  }
  playNetSwish(strong = false) {
    this.scene.tweens.killTweensOf(this.net);
    this.restore(this.net);
    const base = this.baseline.get(this.net)!,
      m = hoopLayout.netMotion;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    this.scene.tweens.add({
      targets: this.net,
      delay: m.delayMs,
      scaleY: base.scaleY * (strong ? m.stretchY : 1.17),
      scaleX: base.scaleX * (strong ? m.squeezeX : 0.95),
      duration: m.stretchMs,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.net,
          scaleX: base.scaleX,
          scaleY: base.scaleY,
          rotation: Phaser.Math.DegToRad(m.swayDegrees),
          duration: 60,
          ease: "Sine.easeInOut",
          onComplete: () => {
            this.scene.tweens.add({
              targets: this.net,
              rotation: -Phaser.Math.DegToRad(m.swayDegrees),
              duration: 90,
              ease: "Sine.easeInOut",
              onComplete: () =>
                this.scene.tweens.add({
                  targets: this.net,
                  rotation: 0,
                  duration: 95,
                  ease: "Sine.easeOut",
                  onComplete: () => this.restore(this.net),
                }),
            });
          },
        });
      },
    });
  }
  playRimHit() {
    for (const image of [this.rimBack, this.rimFront]) {
      this.scene.tweens.killTweensOf(image);
      this.restore(image);
      const base = this.baseline.get(image)!;
      this.scene.tweens.add({
        targets: image,
        x: base.x + hoopLayout.rimMotion.offset,
        duration: hoopLayout.rimMotion.durationMs / 4,
        yoyo: true,
        repeat: 1,
        onComplete: () => this.restore(image),
      });
    }
  }
  playBackboardHit() {
    this.scene.tweens.killTweensOf(this.backboard);
    this.restore(this.backboard);
    const base = this.baseline.get(this.backboard)!;
    this.scene.tweens.add({
      targets: this.backboard,
      y: base.y + 1,
      duration: 40,
      yoyo: true,
      onComplete: () => this.restore(this.backboard),
    });
  }
  drawDebug(ball?: { x: number; y: number }) {
    const g = this.debug;
    if (!g) return;
    g.clear();
    g.lineStyle(1, colorNumber("mint"), 0.65);
    for (const image of [
      this.backboard,
      this.rimBack,
      this.net,
      this.rimFront,
    ]) {
      const b = image.getBounds();
      g.strokeRect(b.x, b.y, b.width, b.height);
      const anchor = image.getWorldTransformMatrix().transformPoint(0, 0);
      g.strokeCircle(anchor.x, anchor.y, 3);
    }
    const center = rimOnScreen(this.getRimCenter());
    const half = hoopLayout.sensors.halfWidth * this.assemblyScale;
    for (const offset of [
      hoopLayout.sensors.top,
      hoopLayout.sensors.center,
      hoopLayout.sensors.exit,
    ])
      g.lineBetween(
        center.x - half,
        center.y + offset * this.assemblyScale,
        center.x + half,
        center.y + offset * this.assemblyScale,
      );
    g.fillStyle(colorNumber("orange"));
    g.fillCircle(center.x, center.y, 3);
    if (ball) {
      g.lineStyle(1, colorNumber("orange"));
      const local = this.container
        .getWorldTransformMatrix()
        .transformPoint(ball.x, ball.y);
      g.strokeCircle(local.x, local.y, 4);
    }
  }
}
