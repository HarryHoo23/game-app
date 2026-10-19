import {
  BufferGeometry,
  Float32BufferAttribute,
  SphereGeometry,
  TorusGeometry,
  Texture,
  SRGBColorSpace,
  RepeatWrapping,
  ClampToEdgeWrapping,
} from "three";
import type { GameConfig } from "../config";
export function validateArt(
  meta: { width: number; height: number; sources: { crop: number[] }[] },
  width: number,
  height: number,
) {
  if (meta.width !== width || meta.height !== height)
    throw new Error(
      `Art dimensions changed: expected ${meta.width}×${meta.height}, got ${width}×${height}. Rebuild production art.`,
    );
  for (const source of meta.sources) {
    const [x, y, w, h] = source.crop;
    if (
      x < 0 ||
      y < 0 ||
      w <= 0 ||
      h <= 0 ||
      x + w > 1.000001 ||
      y + h > 1.000001
    )
      throw new Error("Invalid art crop");
  }
}
export const ballSurface = (c: GameConfig) =>
  new SphereGeometry(c.ball.radius, 48, 32);
export const rimGeometry = (c: GameConfig) =>
  new TorusGeometry(
    c.hoop.innerRadius + c.hoop.tubeRadius,
    c.hoop.tubeRadius,
    12,
    96,
  );
export function netGeometry(c: GameConfig) {
  const positions: number[] = [],
    uv: number[] = [],
    indices: number[] = [],
    weights: number[] = [];
  const sides = 32,
    levels = 12,
    r = c.hoop.innerRadius + c.hoop.tubeRadius;
  for (let j = 0; j <= levels; j++)
    for (let i = 0; i <= sides; i++) {
      const t = j / levels,
        a = (i / sides) * Math.PI * 2 - Math.PI / 2,
        radius = r * (1 - 0.44 * t);
      positions.push(
        Math.cos(a) * radius,
        -t * c.feedback.netHeight,
        Math.sin(a) * radius,
      );
      uv.push(i / sides + 0.25, 1 - t);
      weights.push(t);
      if (j < levels && i < sides) {
        const k = j * (sides + 1) + i;
        indices.push(
          k,
          k + sides + 1,
          k + 1,
          k + 1,
          k + sides + 1,
          k + sides + 2,
        );
      }
    }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return { geometry, base: new Float32Array(positions), weights };
}

const configured = new WeakSet<Texture>();
let uploads = 0;
export const artUploadCount = () => uploads;
export function configureArtTexture(
  texture: Texture,
  meta: {
    width: number;
    height: number;
    sources: { crop: number[] }[];
    repeat: number[];
  },
  key: string,
) {
  const image = texture.image as { width: number; height: number };
  validateArt(meta, image.width, image.height);
  if (configured.has(texture)) return texture;
  configured.add(texture);
  const previous = texture.onUpdate;
  texture.onUpdate = (t) => {
    uploads++;
    previous?.(t);
  };
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  texture.wrapS =
    meta.repeat[0] > 1 || key === "leather"
      ? RepeatWrapping
      : ClampToEdgeWrapping;
  texture.wrapT = key === "leather" ? RepeatWrapping : ClampToEdgeWrapping;
  texture.repeat.set(meta.repeat[0], meta.repeat[1]);
  texture.needsUpdate = true;
  return texture;
}
