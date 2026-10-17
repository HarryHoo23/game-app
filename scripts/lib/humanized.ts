/** Fixed-seed triangular endpoint variation, shared by BEFORE/AFTER and regression tests. */
export function humanGestures(count = 1000, seed = 0x4f18) {
  let state = seed >>> 0;
  const random = () =>
    (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
  const triangular = () => random() + random() - 1;
  return Array.from({ length: count }, (_, index) => {
    const dx = triangular() * 25,
      verticalDrag = 147.5 + triangular() * 22.5;
    const start = { x: 200 + triangular() * 24, y: 674 + triangular() * 12 };
    return {
      index,
      start,
      end: { x: start.x + dx, y: start.y - verticalDrag },
      dx,
      dy: -verticalDrag,
      moves: [5, 12, 30][index % 3],
    };
  });
}
