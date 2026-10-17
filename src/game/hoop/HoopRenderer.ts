import Phaser from "phaser";
import { PERSPECTIVE_CONFIG, rimOnScreen } from "../presentation/perspective";
import {
  canonicalRim,
  canonicalRimScale,
  hoopLayout,
  type HoopLayer,
} from "./hoopLayout";
import { assets } from "../assets/manifest";
import { colorNumber } from "../themes/theme";
/** One source oval and one parent transform, with depth interleaving inside it. */
export class HoopRenderer {
  readonly container: Phaser.GameObjects.Container;
  readonly rimContainer: Phaser.GameObjects.Container;
  private placedBall?: {
    image: Phaser.GameObjects.Image;
    position: { x: number; y: number };
    width: number;
    height: number;
    depth: number;
  };
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
  private netMotionGeneration = 0;
  private netEngaged = false;
  constructor(
    private scene: Phaser.Scene,
    x: number,
    y: number,
  ) {
    this.x = x;
    this.y = y;
    this.container = scene.add.container().setDepth(4);
    this.rimContainer = scene.add.container().setDepth(3);
    this.container.add(this.rimContainer);
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
      (name === "backboard" ? this.container : this.rimContainer).add(image);
      return image;
    };
    this.backboard = create("backboard");
    this.rimBack = create("rimBack");
    this.net = create("net");
    this.rimFront = create("rimFront");
    this.container.sort("depth");
    this.rimFront.setCrop(
      0,
      canonicalRim.frontStartY,
      canonicalRim.frame.width,
      canonicalRim.frame.height - canonicalRim.frontStartY,
    );
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
    this.rimContainer
      .setPosition(0, 0)
      .setScale(canonicalRimScale)
      .setRotation(0);
    for (const name of Object.keys(hoopLayout.layers) as HoopLayer[]) {
      const l = hoopLayout.layers[name],
        image = this[name],
        scale =
          l.width /
          l.frame.width /
          (name === "backboard" ? 1 : canonicalRimScale);
      const divisor = name === "backboard" ? 1 : canonicalRimScale;
      image
        .setPosition(l.offsetX / divisor, l.offsetY / divisor)
        .setScale(scale)
        .setRotation(0);
      this.baseline.set(image, {
        x: image.x,
        y: image.y,
        scaleX: image.scaleX,
        scaleY: image.scaleY,
      });
    }
    this.repositionBall();
  }
  /** Insert the ball in the same display list so front-rim/net occlusion survives grouping. */
  placeBall(
    image: Phaser.GameObjects.Image,
    position: { x: number; y: number },
    width: number,
    height: number,
    depth: number,
  ) {
    this.placedBall = {
      image,
      position: { ...position },
      width,
      height,
      depth,
    };
    if (image.parentContainer !== this.rimContainer)
      this.rimContainer.add(image);
    const local = this.rimContainer.getLocalPoint(position.x, position.y);
    const matrix = this.rimContainer.getWorldTransformMatrix();
    const worldScaleX = Math.hypot(matrix.a, matrix.b);
    const worldScaleY = Math.hypot(matrix.c, matrix.d);
    image
      .setPosition(local.x, local.y)
      .setDisplaySize(width / worldScaleX, height / worldScaleY)
      .setDepth(depth);
    this.rimContainer.sort("depth");
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
    this.netMotionGeneration++;
    this.netEngaged = false;
    this.scene.tweens.killTweensOf(this.rimContainer);
    this.rimContainer.setPosition(0, 0).setRotation(0);
    this.repositionBall();
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
  /** CENTER starts the pull; the deformation stays until the exit sensor releases it. */
  playNetSwish(strong = false, perfect = false) {
    this.netMotionGeneration++;
    this.netEngaged = true;
    this.scene.tweens.killTweensOf(this.net);
    this.restore(this.net);
    const base = this.baseline.get(this.net)!,
      m = hoopLayout.netMotion;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    this.scene.tweens.add({
      targets: this.net,
      delay: m.delayMs,
      scaleY:
        base.scaleY *
        (perfect ? m.perfectStretchY : strong ? m.stretchY : m.rimStretchY),
      scaleX:
        base.scaleX *
        (perfect ? m.perfectSqueezeX : strong ? m.squeezeX : m.rimSqueezeX),
      y:
        base.y +
        (perfect ? m.perfectDropPx : strong ? m.dropPx : m.rimDropPx) /
          (this.assemblyScale * canonicalRimScale),
      duration: m.stretchMs,
      ease: "Sine.easeOut",
    });
  }
  /** EXIT releases the held pull, independently of the score commit or next ball. */
  releaseNet() {
    if (!this.netEngaged) return;
    this.netEngaged = false;
    const generation = ++this.netMotionGeneration;
    this.scene.tweens.killTweensOf(this.net);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.restore(this.net);
      return;
    }
    const base = this.baseline.get(this.net)!,
      m = hoopLayout.netMotion;
    // Recover the pull over the first two sway beats, then dissipate rotation.
    this.scene.tweens.add({
      targets: this.net,
      scaleX: base.scaleX,
      scaleY: base.scaleY,
      y: base.y,
      duration: m.swayDurationMs[0] + m.swayDurationMs[1],
      ease: "Sine.easeOut",
    });
    const sway = (index: number) => {
      if (generation !== this.netMotionGeneration) return;
      this.scene.tweens.add({
        targets: this.net,
        rotation: Phaser.Math.DegToRad(m.swayDegrees[index]),
        duration: m.swayDurationMs[index],
        ease: "Sine.easeInOut",
        onComplete: () => {
          if (generation !== this.netMotionGeneration) return;
          if (index + 1 < m.swayDegrees.length) sway(index + 1);
          else this.restore(this.net);
        },
      });
    };
    sway(0);
  }
  private repositionBall() {
    const ball = this.placedBall;
    if (ball?.image.active)
      this.placeBall(
        ball.image,
        ball.position,
        ball.width,
        ball.height,
        ball.depth,
      );
  }
  playRimHit() {
    this.scene.tweens.killTweensOf(this.rimContainer);
    this.rimContainer.setPosition(0, 0);
    this.scene.tweens.add({
      targets: this.rimContainer,
      // Container positions use outer-assembly units, not its scaled source pixels.
      x: hoopLayout.rimMotion.offset,
      duration: hoopLayout.rimMotion.durationMs / 4,
      yoyo: true,
      repeat: 1,
      onUpdate: () => this.repositionBall(),
      onComplete: () => {
        this.rimContainer.setPosition(0, 0);
        this.repositionBall();
      },
    });
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
  drawDebug(ball?: {
    x: number;
    y: number;
    parentContainer?: Phaser.GameObjects.Container | null;
  }) {
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
      const local = (ball.parentContainer ?? this.container)
        .getWorldTransformMatrix()
        .transformPoint(ball.x, ball.y);
      g.strokeCircle(local.x, local.y, 4);
    }
  }
}
