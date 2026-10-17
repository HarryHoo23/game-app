import { beforeEach, describe, expect, it, vi } from "vitest";
import type Phaser from "phaser";
vi.mock("phaser", () => ({
  default: { Math: { DegToRad: (n: number) => (n * Math.PI) / 180 } },
}));
import { HoopRenderer } from "../game/hoop/HoopRenderer";
import {
  canonicalRim,
  canonicalRimScale,
  hoopLayout,
  netAttachmentY,
} from "../game/hoop/hoopLayout";

// Display-list double: tests exercise renderer orchestration and affine transforms.
// Actual Phaser crop and visual occlusion are covered by the browser checkpoint.
class DisplayObject {
  x = 0;
  y = 0;
  scaleX = 1;
  scaleY = 1;
  rotation = 0;
  depth = 0;
  originX = 0;
  originY = 0;
  active = true;
  parentContainer?: DisplayObject;
  list: DisplayObject[] = [];
  crop?: number[];
  constructor(readonly texture = "") {}
  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
    return this;
  }
  setScale(x: number, y = x) {
    this.scaleX = x;
    this.scaleY = y;
    return this;
  }
  setRotation(n: number) {
    this.rotation = n;
    return this;
  }
  setDepth(n: number) {
    this.depth = n;
    return this;
  }
  setOrigin(x: number, y: number) {
    this.originX = x;
    this.originY = y;
    return this;
  }
  setFlipY() {
    return this;
  }
  setTint() {
    return this;
  }
  setCrop(...crop: number[]) {
    this.crop = crop;
    return this;
  }
  setDisplaySize(w: number, h: number) {
    this.scaleX = w;
    this.scaleY = h;
    return this;
  }
  add(child: DisplayObject) {
    child.parentContainer = this;
    this.list.push(child);
    return this;
  }
  sort() {
    this.list.sort((a, b) => a.depth - b.depth);
    return this;
  }
  getWorldTransformMatrix(): {
    a: number;
    b: number;
    c: number;
    d: number;
    tx: number;
    ty: number;
  } {
    const p = this.parentContainer?.getWorldTransformMatrix() ?? {
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      tx: 0,
      ty: 0,
    };
    return {
      a: p.a * this.scaleX,
      b: 0,
      c: 0,
      d: p.d * this.scaleY,
      tx: p.tx + this.x * p.a,
      ty: p.ty + this.y * p.d,
    };
  }
  getLocalPoint(x: number, y: number) {
    const m = this.getWorldTransformMatrix();
    return { x: (x - m.tx) / m.a, y: (y - m.ty) / m.d };
  }
}
type Tween = {
  targets: DisplayObject;
  x?: number;
  y?: number;
  scaleY?: number;
  duration: number;
  onUpdate?: () => void;
  onComplete?: () => void;
};
function setup() {
  const tweens: Tween[] = [];
  const scene = {
    add: {
      container: () => new DisplayObject(),
      image: (_x: number, _y: number, key: string) => new DisplayObject(key),
    },
    textures: { get: () => ({ has: () => true }) },
    tweens: {
      killTweensOf: vi.fn(),
      add: (t: Tween) => {
        tweens.push(t);
        return t;
      },
    },
  };
  return {
    hoop: new HoopRenderer(scene as unknown as Phaser.Scene, 200, 285),
    tweens,
  };
}
function imageTransform(image: Phaser.GameObjects.Image) {
  return [
    image.x,
    image.y,
    image.scaleX,
    image.scaleY,
    image.rotation,
    image.originX,
    image.originY,
  ];
}
beforeEach(() => {
  vi.stubGlobal("location", { search: "" });
  vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
});
describe("canonical source rim", () => {
  it("renders the same frame and transform twice, cropping only the near half", () => {
    const { hoop } = setup();
    expect((hoop.rimBack as unknown as DisplayObject).texture).toBe(
      (hoop.rimFront as unknown as DisplayObject).texture,
    );
    expect(imageTransform(hoop.rimBack)).toEqual(imageTransform(hoop.rimFront));
    expect(hoop.rimBack.parentContainer).toBe(hoop.rimContainer);
    expect(hoop.rimFront.parentContainer).toBe(hoop.rimContainer);
    expect(hoop.container.list.indexOf(hoop.backboard)).toBeLessThan(
      hoop.container.list.indexOf(hoop.rimContainer),
    );
    expect(hoop.rimContainer.scaleX).toBe(canonicalRimScale);
    expect((hoop.rimFront as unknown as DisplayObject).crop).toEqual([
      0,
      canonicalRim.frontStartY,
      canonicalRim.frame.width,
      canonicalRim.frame.height - canonicalRim.frontStartY,
    ]);
  });
  it("tweens only the shared parent and keeps ball position independent of rim shake", () => {
    const { hoop, tweens } = setup();
    const ball = new DisplayObject();
    hoop.placeBall(
      ball as unknown as Phaser.GameObjects.Image,
      { x: 203, y: 280 },
      25,
      25,
      4,
    );
    hoop.playRimHit();
    expect(tweens).toHaveLength(1);
    expect(tweens[0].targets).toBe(hoop.rimContainer);
    hoop.rimContainer.x = hoopLayout.rimMotion.offset;
    tweens[0].onUpdate!();
    expect(imageTransform(hoop.rimBack)).toEqual(imageTransform(hoop.rimFront));
    const m = ball.getWorldTransformMatrix();
    expect(m.tx).toBeCloseTo(203);
    expect(m.ty).toBeCloseTo(280);
    expect(m.a).toBeCloseTo(25);
    hoop.reset();
    expect(hoop.rimContainer.x).toBe(0);
    expect(imageTransform(hoop.rimBack)).toEqual(imageTransform(hoop.rimFront));
  });
  it("retains front/ball/net ordering and derives net attachment after reset/scale/resize", () => {
    const { hoop } = setup();
    const ball = new DisplayObject();
    for (const scale of [0.73, 1, 1.2]) {
      hoop.setScale(scale).setPosition(180, 270);
      hoop.net.y = 999;
      hoop.reset();
      expect(hoop.net.y * canonicalRimScale).toBeCloseTo(netAttachmentY);
      expect(hoop.net.parentContainer).toBe(hoop.rimContainer);
      expect(imageTransform(hoop.rimBack)).toEqual(
        imageTransform(hoop.rimFront),
      );
      hoop.placeBall(
        ball as unknown as Phaser.GameObjects.Image,
        { x: 180, y: 270 },
        25,
        25,
        hoopLayout.ballDepth.AT_RIM,
      );
      const list = hoop.rimContainer.list;
      expect(list.indexOf(hoop.rimBack)).toBeLessThan(
        list.indexOf(ball as never),
      );
      expect(list.indexOf(ball as never)).toBeLessThan(list.indexOf(hoop.net));
      expect(list.indexOf(hoop.net)).toBeLessThan(list.indexOf(hoop.rimFront));
    }
  });
});
