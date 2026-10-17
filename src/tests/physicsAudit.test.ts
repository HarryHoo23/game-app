import { describe, it, expect } from "vitest";
import {
  alphaSilhouette,
  closestSurface,
  projectVertices,
  normalizedVelocity,
} from "../game/debug/auditGeometry";
import { projectCourtPoint } from "../data/courtPerspective";
describe("physics audit measurements", () => {
  it("projects actual logical collider vertices without introducing a visual sprite transform", () => {
    const rim = { x: 200, y: 285 };
    const vertices = [
      { x: 148, y: 281 },
      { x: 152, y: 285 },
    ];
    expect(projectVertices(vertices, (p) => projectCourtPoint(p, rim))).toEqual(
      [
        { x: 162.04, y: 253.6 },
        { x: 164.96, y: 256.52 },
      ],
    );
  });
  it("distinguishes surface point, center distance and signed polygon distance", () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(closestSurface({ x: 15, y: 6 }, square)).toEqual({
      point: { x: 10, y: 6 },
      distance: 5,
      inside: false,
    });
    const inside = closestSurface({ x: 5, y: 5 }, square);
    expect(inside.inside).toBe(true);
    expect(inside.distance).toBe(-5);
  });
  it("measures a texture alpha silhouette instead of assuming opaque canvas bounds", () => {
    const pixels = new Uint8ClampedArray(9 * 9 * 4);
    for (let y = 2; y <= 6; y++)
      for (let x = 2; x <= 6; x++) pixels[(y * 9 + x) * 4 + 3] = 255;
    const contour = alphaSilhouette(pixels, 9, 9, 128, 8);
    expect(contour).toHaveLength(8);
    expect(
      contour.every((p) => p.x >= 2 && p.x <= 6 && p.y >= 2 && p.y <= 6),
    ).toBe(true);
  });
  it("normalizes substep displacement for collisionStart before Matter normalizes body.velocity", () => {
    expect(
      normalizedVelocity({
        position: { x: 10, y: 12 },
        positionPrev: { x: 8, y: 9 },
        deltaTime: 1000 / 120,
      }),
    ).toEqual({ x: 4, y: 6 });
  });
});
