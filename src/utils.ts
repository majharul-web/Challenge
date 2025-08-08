import type { Point } from "./types";

export function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

export function midpoint(p1: Point, p2: Point): Point {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

export function closestPoint(points: Point[], target: Point): number {
  let minDist = Infinity;
  let index = -1;
  for (let i = 0; i < points.length; i++) {
    const d = distance(points[i], target);
    if (d < minDist) {
      minDist = d;
      index = i;
    }
  }
  return index;
}
