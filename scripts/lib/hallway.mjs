// Hallway centrelines from a building's outline.
//
// A hallway runs down the middle of the building and follows its shape: a straight bar gets
// one straight line, an L gets an L, a U gets a U. Method:
//   1. Rotate the outline so the building's main axis is horizontal.
//   2. Rasterise it (0.5 m cells), closing gaps up to ~4 m so touching wings merge.
//   3. Thin it to a 1-cell skeleton and cut the short diagonal "forks" at the corners.
//   4. Simplify, then square every segment that is within 20° of the axis.
// Coordinates in and out are [lng, lat].

const CELL = 0.5;      // m
const CLOSE_R = 4;     // cells (2 m): bridges small gaps between parts of one building
const SIMPLIFY_M = 1.2;
const SQUARE_DEG = 20;
const MIN_LINE_M = 2;

export function hallwayLines(rings, { KX, KY, pointInRing }) {
  const o = rings[0][0];
  const toM = (c) => [(c[0] - o[0]) * KX, (c[1] - o[1]) * KY];
  const fromM = (p) => [o[0] + p[0] / KX, o[1] + p[1] / KY];
  const mr = rings.map((r) => r.map(toM));

  // main axis = direction of the longest outline edge
  let ang = 0, longest = 0;
  for (const r of mr) for (let i = 0; i < r.length - 1; i++) {
    const dx = r[i + 1][0] - r[i][0], dy = r[i + 1][1] - r[i][1], L = Math.hypot(dx, dy);
    if (L > longest) { longest = L; ang = Math.atan2(dy, dx); }
  }
  const cos = Math.cos(ang), sin = Math.sin(ang);
  const rot = ([x, y]) => [x * cos + y * sin, -x * sin + y * cos];
  const unrot = ([u, v]) => [u * cos - v * sin, u * sin + v * cos];
  const rr = mr.map((r) => r.map(rot));

  // raster
  const pts = rr.flat();
  const PAD = CLOSE_R + 3;
  const minU = Math.min(...pts.map((p) => p[0])), minV = Math.min(...pts.map((p) => p[1]));
  const W = Math.ceil((Math.max(...pts.map((p) => p[0])) - minU) / CELL) + 2 * PAD;
  const H = Math.ceil((Math.max(...pts.map((p) => p[1])) - minV) / CELL) + 2 * PAD;
  const centre = (i, j) => [minU + (i - PAD + 0.5) * CELL, minV + (j - PAD + 0.5) * CELL];
  let g = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (rr.some((r) => pointInRing(centre(i, j), r))) g[j * W + i] = 1;

  // morphological closing (dilate, then erode) with a disc
  const disc = [];
  for (let a = -CLOSE_R; a <= CLOSE_R; a++) for (let b = -CLOSE_R; b <= CLOSE_R; b++) if (a * a + b * b <= CLOSE_R * CLOSE_R) disc.push([a, b]);
  const morph = (src, dilate) => {
    const out = new Uint8Array(W * H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      let v = dilate ? 0 : 1;
      for (const [a, b] of disc) {
        const x = i + a, y = j + b;
        const s = x < 0 || y < 0 || x >= W || y >= H ? 0 : src[y * W + x];
        if (dilate && s) { v = 1; break; }
        if (!dilate && !s) { v = 0; break; }
      }
      out[j * W + i] = v;
    }
    return out;
  };
  g = morph(morph(g, true), false);

  // distance to the outside (chamfer 1 / √2), in cells
  const dist = new Float32Array(W * H);
  for (let k = 0; k < W * H; k++) dist[k] = g[k] ? 1e9 : 0;
  const S2 = Math.SQRT2;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i; if (!dist[k]) continue;
    if (i > 0) dist[k] = Math.min(dist[k], dist[k - 1] + 1);
    if (j > 0) dist[k] = Math.min(dist[k], dist[k - W] + 1);
    if (i > 0 && j > 0) dist[k] = Math.min(dist[k], dist[k - W - 1] + S2);
    if (i < W - 1 && j > 0) dist[k] = Math.min(dist[k], dist[k - W + 1] + S2);
  }
  for (let j = H - 1; j >= 0; j--) for (let i = W - 1; i >= 0; i--) {
    const k = j * W + i; if (!dist[k]) continue;
    if (i < W - 1) dist[k] = Math.min(dist[k], dist[k + 1] + 1);
    if (j < H - 1) dist[k] = Math.min(dist[k], dist[k + W] + 1);
    if (i < W - 1 && j < H - 1) dist[k] = Math.min(dist[k], dist[k + W + 1] + S2);
    if (i > 0 && j < H - 1) dist[k] = Math.min(dist[k], dist[k + W - 1] + S2);
  }

  // Zhang–Suen thinning
  const m = g;
  const P = (x, y) => m[y * W + x];
  for (let changed = true; changed;) {
    changed = false;
    for (const step of [0, 1]) {
      const del = [];
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        if (!P(x, y)) continue;
        const n = [P(x, y - 1), P(x + 1, y - 1), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1), P(x - 1, y + 1), P(x - 1, y), P(x - 1, y - 1)];
        const B = n.reduce((a, b) => a + b, 0);
        if (B < 2 || B > 6) continue;
        let A = 0; for (let k = 0; k < 8; k++) if (!n[k] && n[(k + 1) % 8]) A++;
        if (A !== 1) continue;
        if (step === 0 ? n[0] * n[2] * n[4] || n[2] * n[4] * n[6] : n[0] * n[2] * n[6] || n[0] * n[4] * n[6]) continue;
        del.push(y * W + x);
      }
      for (const k of del) m[k] = 0;
      if (del.length) changed = true;
    }
  }
  const nbrs = (k) => {
    const x = k % W, y = (k / W) | 0, out = [];
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
      if (!a && !b) continue;
      const xx = x + a, yy = y + b;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H && m[yy * W + xx]) out.push(yy * W + xx);
    }
    return out;
  };
  // drop "staircase" pixels so lines are 1 pixel thick with 8-connectivity
  const destair = () => {
    for (let k = 0; k < W * H; k++) {
      if (!m[k]) continue;
      const ns = nbrs(k);
      if (ns.length < 2) continue;
      const seen = new Set([ns[0]]), st = [ns[0]];
      while (st.length) {
        const a = st.pop(), ax = a % W, ay = (a / W) | 0;
        for (const b of ns) if (!seen.has(b) && Math.max(Math.abs(b % W - ax), Math.abs(((b / W) | 0) - ay)) === 1) { seen.add(b); st.push(b); }
      }
      if (seen.size === ns.length) m[k] = 0;
    }
  };
  destair();

  // prune corner forks: a branch from a free end to a junction that is shorter than ~1.6× the
  // building's half-width there is an artefact of the corners, not a hallway
  for (let pass = 0; pass < 6; pass++) {
    let changed = false;
    for (let e = 0; e < W * H; e++) {
      if (!m[e] || nbrs(e).length !== 1) continue;
      const path = [e];
      let prev = -1, cur = e;
      for (;;) {
        const ns = nbrs(cur).filter((q) => q !== prev);
        if (ns.length !== 1) break;
        prev = cur; cur = ns[0]; path.push(cur);
        if (nbrs(cur).length >= 3) break;
      }
      if (cur === e || nbrs(cur).length < 3) continue; // a free-standing line: keep
      if ((path.length - 1) < 1.6 * dist[cur] + 2) { for (const q of path.slice(0, -1)) m[q] = 0; changed = true; }
    }
    if (!changed) break;
    destair();
  }

  // trace skeleton into polylines
  const isNode = (k) => nbrs(k).length !== 2;
  const key = (a, b) => (a < b ? a + "," + b : b + "," + a);
  const used = new Set();
  const lines = [];
  const walk = (s, n1) => {
    const out = [s, n1]; used.add(key(s, n1));
    let prev = s, cur = n1;
    while (!isNode(cur)) {
      const nx = nbrs(cur).find((q) => q !== prev && !used.has(key(cur, q)));
      if (nx === undefined) break;
      used.add(key(cur, nx)); out.push(nx); prev = cur; cur = nx;
      if (cur === s) break;
    }
    return out;
  };
  for (let k = 0; k < W * H; k++) if (m[k] && isNode(k)) for (const q of nbrs(k)) if (!used.has(key(k, q))) lines.push(walk(k, q));
  for (let k = 0; k < W * H; k++) if (m[k]) for (const q of nbrs(k)) if (!used.has(key(k, q))) lines.push(walk(k, q));

  const toUV = (k) => centre(k % W, (k / W) | 0);
  const len = (p) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
  return lines
    .map((l) => l.map(toUV))
    .filter((p) => len(p) >= MIN_LINE_M)
    .map((p) => square(simplify(p, SIMPLIFY_M)))
    .map((p) => p.map((uv) => fromM(unrot(uv))));
}

/**
 * The building's own frame: u runs along its main axis (longest outline edge), v across it.
 * Returns converters and the outline's bounding box in that frame (metres).
 */
export function buildingFrame(rings, { KX, KY }) {
  const o = rings[0][0];
  const toM = (c) => [(c[0] - o[0]) * KX, (c[1] - o[1]) * KY];
  let ang = 0, longest = 0;
  for (const r of rings.map((x) => x.map(toM))) for (let i = 0; i < r.length - 1; i++) {
    const dx = r[i + 1][0] - r[i][0], dy = r[i + 1][1] - r[i][1], L = Math.hypot(dx, dy);
    if (L > longest) { longest = L; ang = Math.atan2(dy, dx); }
  }
  const cos = Math.cos(ang), sin = Math.sin(ang);
  const toUV = (c) => { const [x, y] = toM(c); return [x * cos + y * sin, -x * sin + y * cos]; };
  const fromUV = ([u, v]) => { const x = u * cos - v * sin, y = u * sin + v * cos; return [o[0] + x / KX, o[1] + y / KY]; };
  const pts = rings.flat().map(toUV);
  const box = { u0: Math.min(...pts.map((p) => p[0])), u1: Math.max(...pts.map((p) => p[0])), v0: Math.min(...pts.map((p) => p[1])), v1: Math.max(...pts.map((p) => p[1])) };
  return { toUV, fromUV, box };
}

/** Rectangle inset `m` metres inside the building's frame box, as a closed [lng, lat] ring. */
export function insetRect(rings, m, geo) {
  const { fromUV, box: b } = buildingFrame(rings, geo);
  const r = [[b.u0 + m, b.v0 + m], [b.u1 - m, b.v0 + m], [b.u1 - m, b.v1 - m], [b.u0 + m, b.v1 - m]];
  return [...r, r[0]].map(fromUV);
}

/**
 * Loop hallway around an inner courtyard (e.g. Nursing): a closed rectangle `inset` metres in
 * from the outline, square to the building.
 */
export function ringHallway(rings, inset, geo) {
  return [insetRect(rings, inset, geo)];
}

function simplify(p, eps) {
  if (p.length < 3) return p;
  const a = p[0], b = p[p.length - 1];
  if (a[0] === b[0] && a[1] === b[1]) { // closed loop: split in half
    const h = p.length >> 1;
    return [...simplify(p.slice(0, h + 1), eps).slice(0, -1), ...simplify(p.slice(h), eps)];
  }
  let max = 0, at = 0;
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < p.length - 1; i++) {
    const d = Math.abs(dy * p[i][0] - dx * p[i][1] + b[0] * a[1] - b[1] * a[0]) / L;
    if (d > max) { max = d; at = i; }
  }
  return max > eps ? [...simplify(p.slice(0, at + 1), eps).slice(0, -1), ...simplify(p.slice(at), eps)] : [a, b];
}

// Make near-axis segments exactly horizontal/vertical (in the building's own frame).
function square(p) {
  if (p.length < 2) return p;
  const segs = [];
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i], b = p[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    const t = (Math.abs(Math.atan2(dy, dx)) * 180) / Math.PI;
    const o = t < SQUARE_DEG || t > 180 - SQUARE_DEG ? "H" : Math.abs(t - 90) < SQUARE_DEG ? "V" : "D";
    const k = o === "H" ? (a[1] + b[1]) / 2 : o === "V" ? (a[0] + b[0]) / 2 : null;
    const last = segs[segs.length - 1];
    if (last && last.o === o && o !== "D") { last.k = (last.k * last.L + k * L) / (last.L + L); last.L += L; last.b = b; }
    else segs.push({ a, b, o, k, L });
  }
  // Short diagonal cuts between a horizontal and a vertical run are corner artefacts: square them.
  for (let i = segs.length - 2; i >= 1; i--) {
    const s = segs[i], a = segs[i - 1], b = segs[i + 1];
    if (s.o === "D" && s.L < 10 && a.o !== "D" && b.o !== "D" && a.o !== b.o) segs.splice(i, 1);
  }
  const fix = (pt, s) => (s.o === "H" ? [pt[0], s.k] : s.o === "V" ? [s.k, pt[1]] : pt);
  const out = [fix(segs[0].a, segs[0])];
  for (let i = 0; i < segs.length - 1; i++) {
    const s = segs[i], t = segs[i + 1];
    out.push(s.o === "H" && t.o === "V" ? [t.k, s.k] : s.o === "V" && t.o === "H" ? [s.k, t.k] : fix(fix(s.b, s), t));
  }
  out.push(fix(segs[segs.length - 1].b, segs[segs.length - 1]));
  return out;
}
