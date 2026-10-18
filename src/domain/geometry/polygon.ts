export interface Point {
  x: number;
  y: number;
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
