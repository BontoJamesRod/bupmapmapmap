import type { Graph, LngLat, Place, RouteResult, Step } from "../types";
import { bearing, compass, distanceM, outlineRings, pointInRing, turnAngle } from "./geo";

const WALK_M_PER_MIN = 72; // 1.2 m/s
const FLAG_STEPS = 2;
const FLAG_ROAD = 4;
const FLAG_ROUNDABOUT = 8;
const FLAG_INDOOR = 32;

interface Adj { to: number; len: number; flags: number }

export class Router {
  private adj: Adj[][];
  constructor(private graph: Graph, private places: Place[]) {
    this.adj = graph.nodes.map(() => []);
    for (const [a, b, len, flags] of graph.edges) {
      this.adj[a].push({ to: b, len, flags });
      this.adj[b].push({ to: a, len, flags });
    }
  }

  nodesForPlace(id: string): number[] | undefined {
    const n = this.graph.placeNodes[id];
    return n?.length ? n : undefined;
  }

  nearestNode(pt: LngLat): { node: number; d: number } {
    let best = 0;
    let bestD = Infinity;
    this.graph.nodes.forEach((n, i) => {
      if (!this.adj[i].length) return;
      const d = distanceM(pt, n);
      if (d < bestD) { bestD = d; best = i; }
    });
    return { node: best, d: bestD };
  }

  private cost(e: Adj) {
    let f = 1;
    if (e.flags & FLAG_ROAD) f = 1.1;
    if (e.flags & FLAG_STEPS) f = 1.3;
    return e.len * f;
  }

  /**
   * A* shortest path from any start node to any goal node (a building with several doors
   * passes them all). Returns the node sequence or null.
   */
  shortestPath(starts: number[], goals: number[]): number[] | null {
    const nodes = this.graph.nodes;
    const goalSet = new Set(goals);
    const h = (n: number) => Math.min(...goals.map((t) => distanceM(nodes[n], nodes[t])));
    const g = new Map<number, number>();
    const prev = new Map<number, number>();
    const heap = new MinHeap();
    for (const s of starts) { g.set(s, 0); heap.push(s, h(s)); }
    const closed = new Set<number>();
    let goal = -1;
    while (heap.size) {
      const cur = heap.pop()!;
      if (goalSet.has(cur)) { goal = cur; break; }
      if (closed.has(cur)) continue;
      closed.add(cur);
      for (const e of this.adj[cur]) {
        const ng = g.get(cur)! + this.cost(e);
        if (ng < (g.get(e.to) ?? Infinity)) {
          g.set(e.to, ng);
          prev.set(e.to, cur);
          heap.push(e.to, ng + h(e.to));
        }
      }
    }
    if (goal < 0) return null;
    const seq = [goal];
    while (prev.has(seq[0]) && g.get(seq[0])! > 0) seq.unshift(prev.get(seq[0])!);
    return seq;
  }

  private edgeFlags(a: number, b: number): number {
    return this.adj[a].find((e) => e.to === b)?.flags ?? 0;
  }

  /**
   * Route between two endpoints. `fromDoor`/`toDoor` are the real start/end points
   * (building edge or GPS position); they are joined to the network with short walk links.
   */
  route(opts: {
    fromNodes: number[]; toNodes: number[];
    /** Real start/end points; omit to start/end exactly at the chosen door node. */
    fromPoint?: LngLat; toPoint?: LngLat;
    fromLabel: string; toLabel: string;
    excludeLandmarks: string[];
  }): RouteResult | null {
    const seq = this.shortestPath(opts.fromNodes, opts.toNodes);
    if (!seq) return null;
    const nodes = this.graph.nodes;
    // `full` stays index-aligned with `seq` (full[k] = seq[k-1]) for instruction building.
    const full: LngLat[] = [
      opts.fromPoint ?? nodes[seq[0]], ...seq.map((i) => nodes[i]), opts.toPoint ?? nodes[seq[seq.length - 1]],
    ];
    const path = full.filter((p, i, arr) => i === 0 || distanceM(p, arr[i - 1]) > 0.5);
    let total = 0;
    for (let i = 1; i < path.length; i++) total += distanceM(path[i - 1], path[i]);
    const steps = this.instructions(full, seq, opts);
    return {
      path,
      distanceM: Math.max(5, Math.round(total / 5) * 5),
      minutes: Math.max(1, Math.ceil(total / WALK_M_PER_MIN)),
      steps,
    };
  }

  /** Short name of the building whose outline contains `pt`. */
  private buildingAt(pt: LngLat): string | null {
    const p = this.places.find((x) => x.properties.kind === "building" && outlineRings(x).some((r) => pointInRing(pt, r)));
    return p ? p.properties.shortName ?? p.properties.name : null;
  }

  private landmarkNear(pt: LngLat, exclude: Set<string>, maxM = 28): string | null {
    let best: Place | null = null;
    let bestD = Infinity;
    for (const p of this.places) {
      const pr = p.properties;
      if (exclude.has(pr.id) || !pr.identified) continue;
      // distance to the building outline, approximated by its vertices + center
      const pts = p.geometry.type === "Point" ? [p.geometry.coordinates] : [...outlineRings(p).flat(), pr.center];
      const d = Math.min(...pts.map((q) => distanceM(pt, q)));
      if (d < bestD) { bestD = d; best = p; }
    }
    return best && bestD <= maxM ? best.properties.shortName ?? best.properties.name : null;
  }

  private instructions(
    path: LngLat[], seq: number[],
    opts: { fromLabel: string; toLabel: string; excludeLandmarks: string[] },
  ): Step[] {
    const exclude = new Set(opts.excludeLandmarks);
    const steps: Step[] = [];
    const first = path.findIndex((p, i) => i > 0 && distanceM(path[i - 1], p) > 1);
    if (first < 0) {
      return [{ icon: "arrive", text: `You're already at ${opts.toLabel}.`, distanceM: 0 }];
    }
    // Mark which path vertices are on the roundabout (path[k+1] ↔ seq[k]).
    const onRoundabout = path.map((_, k) => {
      const i = k - 1;
      if (i < 0 || i >= seq.length) return false;
      const a = seq[i - 1], b = seq[i], c = seq[i + 1];
      return (a !== undefined && (this.edgeFlags(a, b) & FLAG_ROUNDABOUT) > 0) ||
             (c !== undefined && (this.edgeFlags(b, c) & FLAG_ROUNDABOUT) > 0);
    });

    let heading = bearing(path[first - 1], path[first]);
    steps.push({
      icon: "depart",
      text: `Start at ${opts.fromLabel} and head ${compass(heading)}.`,
      distanceM: 0,
    });
    let segLen = 0;
    let k = 1;
    // Starting inside a building means already being in its hallway.
    const startHost = this.buildingAt(path[first - 1]);
    let inHallway: string | null = startHost ? `${startHost} hallway` : null;
    while (k < path.length - 1) {
      segLen += distanceM(path[k - 1], path[k]);
      if (onRoundabout[k]) {
        // consume the whole roundabout
        const entryHeading = heading;
        let j = k;
        while (j < path.length - 1 && onRoundabout[j + 1]) j++;
        for (let m = k; m < j; m++) segLen += distanceM(path[m], path[m + 1]);
        let x = j;
        while (x < path.length - 2 && distanceM(path[x], path[x + 1]) < 1) x++;
        const exitHeading = bearing(path[x], path[x + 1]);
        const t = turnAngle(entryHeading, exitHeading);
        const dir = Math.abs(t) < 35 ? "continue straight" : t > 0 ? "take the exit to the right" : "take the exit to the left";
        steps[steps.length - 1].distanceM += Math.round(segLen);
        steps.push({ icon: "roundabout", text: `At the roundabout, ${dir}.`, distanceM: 0 });
        segLen = 0;
        heading = exitHeading;
        k = j + 1;
        continue;
      }
      if (distanceM(path[k], path[k + 1]) < 1) { k++; continue; }
      const next = bearing(path[k], path[k + 1]);
      const t = turnAngle(heading, next);
      const abs = Math.abs(t);
      // path[k] ↔ seq[k-1]; the outgoing edge is seq[k-1] → seq[k]
      const indoor = k < seq.length && (this.edgeFlags(seq[k - 1], seq[k]) & FLAG_INDOOR) > 0;
      const mid: LngLat = [(path[k][0] + path[k + 1][0]) / 2, (path[k][1] + path[k + 1][1]) / 2];
      const host = indoor ? this.buildingAt(mid) : null;
      // Name the hallway once when entering it, not at every bend inside it.
      const hall = host ? `${host} hallway` : null;
      if (abs >= 30) {
        const icon: Step["icon"] =
          abs > 150 ? "u-turn" : abs < 55 ? (t > 0 ? "slight-right" : "slight-left") : t > 0 ? "right" : "left";
        const verb =
          icon === "u-turn" ? "Turn around" :
          icon === "slight-right" ? "Bear right" : icon === "slight-left" ? "Bear left" :
          icon === "right" ? "Turn right" : "Turn left";
        const lm = host ?? this.landmarkNear(path[k], exclude);
        steps[steps.length - 1].distanceM += Math.round(segLen);
        const text = hall
          ? hall === inHallway ? `${verb}, staying in the hallway.` : `${verb} into the ${hall}.`
          : lm ? `${verb} near the ${lm}.` : `${verb}.`;
        inHallway = hall;
        steps.push({ icon, text, distanceM: 0 });
        segLen = 0;
        heading = next;
      } else {
        if (hall && hall !== inHallway) {
          // walking straight in through a door
          steps[steps.length - 1].distanceM += Math.round(segLen);
          steps.push({ icon: "straight", text: `Go straight into the ${hall}.`, distanceM: 0 });
          segLen = 0;
        }
        inHallway = hall;
        heading = next;
      }
      k++;
    }
    segLen += distanceM(path[path.length - 2], path[path.length - 1]);
    steps[steps.length - 1].distanceM += Math.round(segLen);

    // Merge tiny legs (< 8 m) into the following step to avoid noisy instructions.
    const merged: Step[] = [];
    for (const s of steps) {
      const last = merged[merged.length - 1];
      if (last && last.icon !== "depart" && last.distanceM < 8 && s.icon !== "roundabout") {
        last.distanceM += s.distanceM;
        continue;
      }
      merged.push(s);
    }
    merged.push({ icon: "arrive", text: `Arrive at ${opts.toLabel}.`, distanceM: 0 });
    return merged;
  }
}

class MinHeap {
  private items: { v: number; p: number }[] = [];
  get size() { return this.items.length; }
  push(v: number, p: number) {
    const a = this.items;
    a.push({ v, p });
    let i = a.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (a[parent].p <= a[i].p) break;
      [a[parent], a[i]] = [a[i], a[parent]];
      i = parent;
    }
  }
  pop(): number | undefined {
    const a = this.items;
    if (!a.length) return undefined;
    const top = a[0].v;
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l].p < a[m].p) m = l;
        if (r < a.length && a[r].p < a[m].p) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}
