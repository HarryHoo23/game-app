export interface Vec {
  x: number;
  y: number;
}
export class BasketDetector {
  private entered = false;
  private done = false;
  constructor(
    private x: number,
    private y: number,
    private halfWidth: number,
    private radius: number,
  ) {}
  invalidate() {
    this.done = true;
  }
  sample(a: Vec, b: Vec): boolean {
    if (this.done || b.y <= a.y) {
      if (b.y < a.y) this.entered = false;
      return false;
    }
    const at = (y: number) => a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y);
    const inside = (x: number) =>
      Math.abs(x - this.x) <= this.halfWidth - this.radius;
    if (a.y < this.y && b.y >= this.y) {
      this.entered = inside(at(this.y));
    }
    const lower = this.y + this.radius * 2;
    if (this.entered && a.y < lower && b.y >= lower) {
      this.entered = false;
      if (inside(at(lower))) {
        this.done = true;
        return true;
      }
    }
    if (this.entered && !inside(b.x)) this.entered = false;
    return false;
  }
}
