export interface GesturePoint {
  x: number;
  y: number;
}

/** Raw endpoints determine release; equipment smoothing only affects preview. */
export class ShotGesture {
  readonly start: GesturePoint;
  current: GesturePoint;
  readonly previewDrag = { x: 0, y: 0 };

  constructor(
    start: GesturePoint,
    private smoothing: number,
  ) {
    this.start = { ...start };
    this.current = { ...start };
  }

  move(point: GesturePoint) {
    this.current = { x: point.x, y: point.y };
    const k = 1 - this.smoothing;
    this.previewDrag.x += (point.x - this.start.x - this.previewDrag.x) * k;
    this.previewDrag.y += (point.y - this.start.y - this.previewDrag.y) * k;
  }

  release(end: GesturePoint) {
    this.current = { x: end.x, y: end.y };
    return {
      dx: this.current.x - this.start.x,
      dy: this.current.y - this.start.y,
    };
  }
}
