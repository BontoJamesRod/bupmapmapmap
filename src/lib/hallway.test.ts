import { describe, expect, it } from "vitest";
// @ts-expect-error build-time JS module without type declarations
import { hallwayLines, ringHallway } from "../../scripts/lib/hallway.mjs";

// Work in a tiny local frame: 1 unit = 1 m.
const geo = {
  KX: 1, KY: 1,
  pointInRing: (pt: number[], ring: number[][]) => {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  },
};
const rotate = (ring: number[][], deg: number) => {
  const a = (deg * Math.PI) / 180;
  return ring.map(([x, y]) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]);
};
const segAngles = (line: number[][]) =>
  line.slice(1).map((q, i) => (Math.atan2(q[1] - line[i][1], q[0] - line[i][0]) * 180) / Math.PI);
const turn = (a: number, b: number) => Math.abs((((b - a) % 360) + 540) % 360 - 180);

describe("hallway centrelines", () => {
  it("runs one straight line down the middle of a bar", () => {
    const bar = [[0, 0], [60, 0], [60, 12], [0, 12], [0, 0]];
    const lines = hallwayLines([bar], geo);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toHaveLength(2);
    for (const [, y] of lines[0]) expect(Math.abs(y - 6)).toBeLessThan(0.6); // centred
  });

  it("follows a rotated U with square corners", () => {
    // U opening upwards: base 50 × 10, arms 10 wide and 40 tall
    const u = rotate([[0, 0], [50, 0], [50, 40], [40, 40], [40, 10], [10, 10], [10, 40], [0, 40], [0, 0]], 33);
    const lines = hallwayLines([u], geo);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toHaveLength(4); // arm → base → arm
    const ang = segAngles(lines[0]);
    expect(Math.abs(turn(ang[0], ang[1]) - 90)).toBeLessThan(1);
    expect(Math.abs(turn(ang[1], ang[2]) - 90)).toBeLessThan(1);
  });

  it("joins separately mapped wings into one hallway", () => {
    // a bar plus a wing 1.5 m away from it, end to end
    const a = [[0, 0], [30, 0], [30, 10], [0, 10], [0, 0]];
    const b = [[31.5, 0], [60, 0], [60, 10], [31.5, 10], [31.5, 0]];
    const lines = hallwayLines([a, b], geo);
    expect(lines).toHaveLength(1);
  });

  it("draws a closed loop for a building around an inner court", () => {
    const block = rotate([[0, 0], [60, 0], [60, 36], [0, 36], [0, 0]], 20);
    const [loop] = ringHallway([block], 7, geo);
    expect(loop).toHaveLength(5);
    expect(loop[0]).toEqual(loop[4]);
    const side = (i: number) => Math.hypot(loop[i + 1][0] - loop[i][0], loop[i + 1][1] - loop[i][1]);
    expect(side(0)).toBeCloseTo(46, 0); // 60 − 2×7
    expect(side(1)).toBeCloseTo(22, 0); // 36 − 2×7
  });
});
