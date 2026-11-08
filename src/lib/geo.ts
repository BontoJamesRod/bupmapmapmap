import type { LngLat, Place } from "../types";

// Local equirectangular projection in metres — accurate to <0.1% across the campus.
const LAT0 = 13.296;
const KX = Math.cos((LAT0 * Math.PI) / 180) * 111320;
const KY = 110600;

export const toXY = ([lng, lat]: LngLat): [number, number] => [lng * KX, lat * KY];

export function distanceM(a: LngLat, b: LngLat): number {
  const [ax, ay] = toXY(a);
  const [bx, by] = toXY(b);
  return Math.hypot(ax - bx, ay - by);
}

/** Compass bearing in degrees (0 = north, 90 = east). */
export function bearing(a: LngLat, b: LngLat): number {
  const [ax, ay] = toXY(a);
  const [bx, by] = toXY(b);
  return ((Math.atan2(bx - ax, by - ay) * 180) / Math.PI + 360) % 360;
}

/** Signed turn angle from heading h1 to h2, in (-180, 180]. Positive = right. */
export function turnAngle(h1: number, h2: number): number {
  let d = h2 - h1;
  while (d > 180) d -= 360;
  while (d <= -180) d += 360;
  return d;
}

const COMPASS = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
export const compass = (deg: number) => COMPASS[Math.round(deg / 45) % 8];

export function pointInRing(pt: LngLat, ring: LngLat[]): boolean {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** Outer rings of a place's outline (none for a point). */
export function outlineRings(p: Place): LngLat[][] {
  const g = p.geometry;
  return g.type === "Polygon" ? [g.coordinates[0]] : g.type === "MultiPolygon" ? g.coordinates.map((poly) => poly[0]) : [];
}
