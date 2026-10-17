/** Read-only measurements for DEV diagnostics. Never changes collision geometry. */
export interface Point {
  x: number;
  y: number;
}
export function projectVertices(
  vertices: readonly Point[],
  project: (p: Point) => Point,
) {
  return vertices.map(project);
}
export function closestSurface(point: Point, vertices: readonly Point[]) {
  let inside = false,
    best = Infinity,
    nearest = { x: NaN, y: NaN };
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[j],
      b = vertices[i];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
    const dx = b.x - a.x,
      dy = b.y - a.y,
      length = dx * dx + dy * dy;
    const t = length
      ? Math.max(
          0,
          Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length),
        )
      : 0;
    const p = { x: a.x + t * dx, y: a.y + t * dy },
      distance = Math.hypot(p.x - point.x, p.y - point.y);
    if (distance < best) {
      best = distance;
      nearest = p;
    }
  }
  return { point: nearest, distance: inside ? -best : best, inside };
}
/** Outer alpha contour of the basketball, sampled radially once from its source texture. */
export function alphaSilhouette(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  cutoff = 128,
  rays = 96,
): Point[] {
  const cx = (width - 1) / 2,
    cy = (height - 1) / 2,
    limit = Math.ceil(Math.hypot(width, height) / 2),
    out: Point[] = [];
  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2,
      c = Math.cos(angle),
      s = Math.sin(angle);
    for (let r = limit; r >= 0; r--) {
      const x = Math.round(cx + r * c),
        y = Math.round(cy + r * s);
      if (
        x >= 0 &&
        x < width &&
        y >= 0 &&
        y < height &&
        data[(y * width + x) * 4 + 3] >= cutoff
      ) {
        out.push({ x, y });
        break;
      }
    }
  }
  return out;
}
/** Matter collisionStart precedes the engine's final normalized velocity update. */
export function normalizedVelocity(body: {
  position: Point;
  positionPrev: Point;
  deltaTime: number;
}): Point {
  const multiplier = 1000 / 60 / body.deltaTime;
  return {
    x: (body.position.x - body.positionPrev.x) * multiplier,
    y: (body.position.y - body.positionPrev.y) * multiplier,
  };
}
