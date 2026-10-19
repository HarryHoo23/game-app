import { Texture } from "three";
import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  validateArt,
  ballSurface,
  rimGeometry,
  netGeometry,
  configureArtTexture,
} from "../src/scene/artGeometry";
import manifest from "../src/assets/production/manifest.json";
import { config as c } from "../src/config";
it("production metadata validates real sizes, normalized crops and preserved board proportions", () => {
  for (const meta of Object.values(manifest.assets)) {
    expect(() => validateArt(meta, meta.width, meta.height)).not.toThrow();
    expect(() => validateArt(meta, meta.width + 1, meta.height)).toThrow();
    expect(
      readFileSync(
        new URL("../src/assets/production/" + meta.file, import.meta.url),
      ).length,
    ).toBe(meta.bytes);
    for (const source of meta.sources) {
      const [x, y, w, h] = source.crop;
      expect(x + w).toBeLessThanOrEqual(1);
      expect(y + h).toBeLessThanOrEqual(1);
      expect(w * h).toBeGreaterThan(0);
    }
  }
  const b = manifest.assets.board;
  expect(b.width / b.height).toBeCloseTo(c.board.size.x / c.board.size.y, 2);
  expect(manifest.productionBytes).toBeLessThan(manifest.sourceBytes * 0.12);
});
it("ball and full hollow ring preserve collider dimensions; source leather never mirrors a photograph", () => {
  const ball = ballSurface(c),
    rim = rimGeometry(c);
  const p = ball.attributes.position;
  for (let i = 0; i < p.count; i++)
    expect(Math.hypot(p.getX(i), p.getY(i), p.getZ(i))).toBeCloseTo(
      c.ball.radius,
      6,
    );
  const r = rim.attributes.position;
  for (let i = 0; i < r.count; i++)
    expect(Math.hypot(r.getX(i), r.getY(i))).toBeGreaterThanOrEqual(
      c.hoop.innerRadius - 1e-7,
    );
  expect(rim.parameters.arc).toBeCloseTo(Math.PI * 2);
  ball.dispose();
  rim.dispose();
});
it("net atlas wraps cylindrically with an anchored open top and bounded static geometry", () => {
  const { geometry, weights } = netGeometry(c),
    p = geometry.attributes.position,
    uv = geometry.attributes.uv;
  expect(p.count).toBeLessThanOrEqual(500);
  expect(weights.filter((w) => w === 0).length).toBeGreaterThan(20);
  for (let i = 0; i < 33; i++) {
    expect(p.getY(i)).toBeCloseTo(0, 7);
    expect(Math.hypot(p.getX(i), p.getZ(i))).toBeCloseTo(
      c.hoop.innerRadius + c.hoop.tubeRadius,
      6,
    );
  }
  expect(uv.getX(0)).toBe(0.25);
  expect(uv.getX(32)).toBe(1.25);
  geometry.dispose();
});

it("reusing a cached art texture does not request another GPU upload on each ball spawn", () => {
  const texture = new Texture();
  texture.image = { width: 256, height: 256 };
  configureArtTexture(texture, manifest.assets.leather, "leather");
  const first = texture.version;
  for (let i = 0; i < 30; i++)
    configureArtTexture(texture, manifest.assets.leather, "leather");
  expect(texture.version).toBe(first);
  texture.dispose();
});
