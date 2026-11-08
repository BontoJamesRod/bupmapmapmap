// Merges the OSM import with human overrides, validates, and emits runtime data:
//   public/data/campus.json  (boundary, places)
//   public/data/graph.json   (walkable network for routing)
// Run: npm run data:build      See docs/04-data-model.md and docs/05-routing-spec.md
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import * as yaml from "js-yaml";
import { hallwayLines, ringHallway } from "./lib/hallway.mjs";

const root = new URL("../", import.meta.url);
const p = (rel) => new URL(rel, root);

const CATEGORIES = [
  "academic", "administrative", "student-services", "health", "food",
  "sports", "residential", "utility", "security", "commercial",
];
const KINDS = ["building", "poi", "gate", "area"];
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HTMLISH = /<\/?[a-z]/i;
const MAX_CONNECTOR_M = 60; // place → path link longer than this is reported
const DENSIFY_M = 20;

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

// ── geometry helpers (local equirectangular metres; campus is < 1 km) ──
const LAT0 = 13.296;
const KX = Math.cos((LAT0 * Math.PI) / 180) * 111320;
const KY = 110600;
const toXY = ([lng, lat]) => [lng * KX, lat * KY];
const dist = (a, b) => { const [ax, ay] = toXY(a), [bx, by] = toXY(b); return Math.hypot(ax - bx, ay - by); };
const round6 = (n) => Math.round(n * 1e6) / 1e6;
const r6 = ([x, y]) => [round6(x), round6(y)];

function projectOnSegment(pt, a, b) {
  const [px, py] = toXY(pt), [ax, ay] = toXY(a), [bx, by] = toXY(b);
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const q = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  return { t, q, d: dist(pt, q) };
}
function centroid(ring) {
  // Relative to the first vertex to avoid floating-point cancellation on tiny polygons.
  const [ox, oy] = ring[0];
  let x = 0, y = 0, a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const x0 = ring[i][0] - ox, y0 = ring[i][1] - oy, x1 = ring[i + 1][0] - ox, y1 = ring[i + 1][1] - oy;
    const f = x0 * y1 - x1 * y0;
    a += f; x += (x0 + x1) * f; y += (y0 + y1) * f;
  }
  if (Math.abs(a) < 1e-18) return ring[0];
  return [ox + x / (3 * a), oy + y / (3 * a)];
}
function pointInRing(pt, ring) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const geomToCoords = (g) => g.map((n) => [n.lon, n.lat]);
/** Outer rings of a Polygon / MultiPolygon (empty for points). */
const ringsOf = (g) => (g.type === "Polygon" ? [g.coordinates[0]] : g.type === "MultiPolygon" ? g.coordinates.map((p) => p[0]) : []);
const inPlace = (pt, g) => ringsOf(g).some((r) => pointInRing(pt, r));
/** Nearest point on a place's outline. */
function nearestOnOutline(pt, g) {
  let best = null;
  for (const r of ringsOf(g)) for (let i = 0; i < r.length - 1; i++) {
    const pr = projectOnSegment(pt, r[i], r[i + 1]);
    if (!best || pr.d < best.d) best = pr;
  }
  return best;
}

// Join boundary member ways into a closed ring.
function stitchRing(segments) {
  const segs = segments.map((s) => [...s]);
  const ring = segs.shift();
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  while (segs.length) {
    const end = ring[ring.length - 1];
    const i = segs.findIndex((s) => same(s[0], end) || same(s[s.length - 1], end));
    if (i < 0) { warn("Campus boundary could not be fully stitched"); break; }
    const s = segs.splice(i, 1)[0];
    if (!same(s[0], end)) s.reverse();
    ring.push(...s.slice(1));
  }
  return ring;
}

// ── load inputs ──
const rawPath = existsSync(p("data/raw/osm-campus.json")) ? "data/raw/osm-campus.json" : "data/raw/osm-snapshot-2026-11-07.json";
const raw = JSON.parse(await readFile(p(rawPath), "utf8"));
const overrides = yaml.load(await readFile(p("data/overrides/places.yaml"), "utf8")) ?? {};
const manualPaths = existsSync(p("data/overrides/paths.geojson"))
  ? JSON.parse(await readFile(p("data/overrides/paths.geojson"), "utf8")).features ?? []
  : [];

const els = raw.elements;
const byRef = new Map(els.map((e) => [`${e.type}/${e.id}`, e]));

// ── campus boundary ──
const rel = els.find((e) => e.type === "relation");
const boundary = stitchRing(rel.members.filter((m) => m.role === "outer" && m.geometry).map((m) => geomToCoords(m.geometry)));
const lngs = boundary.map((c) => c[0]), lats = boundary.map((c) => c[1]);
const bounds = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)].map(round6);

// ── places ──
const places = [];
const layout = new Map(); // id → { hallway, doors } (build-time only)
const usedRefs = new Set();
const ids = new Set();

for (const [id, o] of Object.entries(overrides)) {
  const where = `places.yaml → ${id}`;
  if (!ID_RE.test(id)) err(`${where}: id must be kebab-case`);
  if (ids.has(id)) err(`${where}: duplicate id`);
  ids.add(id);
  if (o.retired) { if (o.osm) usedRefs.add(o.osm); continue; }

  let el = null;
  if (o.osm) {
    el = byRef.get(o.osm);
    if (!el) { err(`${where}: OSM element ${o.osm} not found in import (deleted upstream? mark retired: true)`); continue; }
    usedRefs.add(o.osm);
  }

  let geometry;
  if (el?.type === "way") {
    const ring = geomToCoords(el.geometry);
    geometry = { type: "Polygon", coordinates: [ring.map(r6)] };
    // parts: other OSM outlines that belong to the same building (e.g. wings mapped separately)
    if (o.parts?.length) {
      const polys = [[ring.map(r6)]];
      for (const ref of o.parts) {
        const pe = byRef.get(ref);
        if (pe?.type !== "way") { err(`${where}: part ${ref} not found in import`); continue; }
        usedRefs.add(ref);
        polys.push([geomToCoords(pe.geometry).map(r6)]);
      }
      geometry = { type: "MultiPolygon", coordinates: polys };
    }
  } else if (el?.type === "node") {
    geometry = { type: "Point", coordinates: r6([el.lon, el.lat]) };
  } else if (o.geometry) {
    geometry = o.geometry;
  } else {
    err(`${where}: needs either osm: or geometry:`);
    continue;
  }

  const kind = o.kind ?? (geometry.type === "Point" ? "poi" : "building");
  const props = {
    id,
    kind,
    name: o.name ?? el?.tags?.name,
    shortName: o.shortName ?? null,
    category: o.category,
    description: o.description ?? null,
    aliases: (o.aliases ?? []).map((a) => String(a).toLowerCase()),
    departments: o.departments ?? [],
    offices: o.offices ?? [],
    rooms: o.rooms ?? [],
    floors: o.floors ?? (el?.tags?.["building:levels"] ? Number(el.tags["building:levels"]) : null),
    parentId: o.parentId ?? null,
    hours: o.hours ?? el?.tags?.opening_hours ?? null,
    surface: o.surface ?? null,
    verified: Boolean(o.verified),
    identified: !/^Unidentified/i.test(o.name ?? ""),
    source: o.source ?? ["osm"],
    osm: o.osm ?? null,
  };

  if (!props.name) err(`${where}: name is required`);
  if (!CATEGORIES.includes(props.category)) err(`${where}: category "${props.category}" must be one of ${CATEGORIES.join(", ")}`);
  if (!KINDS.includes(kind)) err(`${where}: kind "${kind}" invalid`);
  if (o.surface && !["grass", "court", "paved"].includes(o.surface)) err(`${where}: surface must be grass, court or paved`);
  const allText = JSON.stringify([props.name, props.shortName, props.description, props.aliases, props.departments, props.offices, props.rooms]);
  if (HTMLISH.test(allText)) err(`${where}: text must not contain HTML`);

  const c = geometry.type === "Point" ? geometry.coordinates : centroid(ringsOf(geometry)[0]); // main part
  props.center = r6(c);
  if (!pointInRing(c, boundary)) {
    const d = Math.min(...boundary.slice(1).map((b, i) => projectOnSegment(c, boundary[i], b).d));
    if (d > 30) err(`${where}: lies ${Math.round(d)} m outside the campus boundary`);
  }
  if (o.doors !== undefined && (!Array.isArray(o.doors) || o.doors.some((d) => !Array.isArray(d) || d.length !== 2))) err(`${where}: doors must be a list of [lng, lat]`);
  if (o.hallway && geometry.type === "Point") err(`${where}: hallway needs a building outline`);
  if (o.hallway !== undefined && ![true, false, "ring"].includes(o.hallway)) err(`${where}: hallway must be true or "ring"`);
  layout.set(id, { hallway: o.hallway ?? false, hallwayInset: o.hallwayInset ?? 7, doors: o.doors ?? [] });
  if (o.labelAt) {
    if (!Array.isArray(o.labelAt) || o.labelAt.length !== 2) err(`${where}: labelAt must be [lng, lat]`);
    else props.labelAt = r6(o.labelAt);
  }
  places.push({ type: "Feature", id, geometry, properties: props });
}

// Every OSM building must be claimed by an override, so nothing appears unnamed by accident.
for (const e of els) {
  if (e.type === "way" && e.tags?.building && !usedRefs.has(`way/${e.id}`)) {
    err(`OSM building way/${e.id} (${e.tags.name ?? "unnamed"}) has no entry in places.yaml`);
  }
}

// POIs inside a building polygon get parentId automatically.
for (const f of places) {
  if (f.geometry.type !== "Point" || f.properties.parentId) continue;
  const host = places.find((b) => b.geometry.type !== "Point" && inPlace(f.geometry.coordinates, b.geometry));
  if (host) f.properties.parentId = host.id;
}

// ── path graph ──
const nodes = [];           // [lng, lat]
const nodeIndex = new Map(); // key → index
const adj = new Map();       // "a-b" → edge
const edges = [];
const keyOf = (c) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`;
function nodeAt(c) {
  const k = keyOf(c);
  if (!nodeIndex.has(k)) { nodeIndex.set(k, nodes.length); nodes.push(r6(c)); }
  return nodeIndex.get(k);
}
function addEdge(a, b, flags = 0) {
  if (a === b) return;
  const k = a < b ? `${a}-${b}` : `${b}-${a}`;
  if (adj.has(k)) return;
  const e = [a, b, Math.round(dist(nodes[a], nodes[b]) * 10) / 10, flags];
  adj.set(k, e);
  edges.push(e);
}
const hallNodes = new Map(); // place id → node indices on its hallway
function addLine(coords, flags, hallOf = null) {
  if (hallOf && !hallNodes.has(hallOf)) hallNodes.set(hallOf, new Set());
  const tag = hallOf ? hallNodes.get(hallOf) : null;
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i], b = coords[i + 1];
    const n = Math.max(1, Math.ceil(dist(a, b) / DENSIFY_M));
    let prev = nodeAt(a);
    tag?.add(prev);
    for (let s = 1; s <= n; s++) {
      const t = s / n;
      const cur = nodeAt([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
      tag?.add(cur);
      addEdge(prev, cur, flags);
      prev = cur;
    }
  }
}
// flags: 1 covered, 2 steps, 4 vehicle road, 8 roundabout, 16 connector, 32 indoor corridor
const FOOT = new Set(["footway", "path", "pedestrian", "steps", "corridor"]);
const lines = [];
for (const e of els) {
  if (e.type !== "way" || !e.tags?.highway) continue;
  let flags = FOOT.has(e.tags.highway) ? 0 : 4;
  if (e.tags.highway === "steps") flags |= 2;
  if (e.tags.covered === "yes") flags |= 1;
  if (e.tags.junction === "circular" || e.tags.junction === "roundabout") flags |= 8;
  lines.push({ coords: geomToCoords(e.geometry), flags });
}
for (const f of manualPaths) {
  const pr = f.properties ?? {};
  let flags = pr.kind === "road" ? 4 : 0;
  if (pr.covered) flags |= 1;
  if (pr.steps) flags |= 2;
  if (pr.kind === "corridor") flags |= 32 | 1;
  lines.push({ coords: f.geometry.coordinates.map((c) => [...c]), flags, kind: pr.kind ?? "footway", drawn: true });
}

// ── generated hallways and doors (places.yaml: hallway: true, doors: [[lng, lat], …]) ──
// Hallways follow the building's own shape (see scripts/lib/hallway.mjs). Each door is snapped onto
// the outline and joined by straight links: inward to the building's hallway, outward to the
// nearest road, walkway or other hallway.
const FLAG_HALL = 32 | 1;
const DOOR_REACH_M = 35;
for (const f of places) {
  if (!layout.get(f.id)?.hallway) continue;
  const lay = layout.get(f.id);
  const hl = lay.hallway === "ring"
    ? ringHallway(ringsOf(f.geometry), lay.hallwayInset, { KX, KY }) // loop around an inner court
    : hallwayLines(ringsOf(f.geometry), { KX, KY, pointInRing });
  if (!hl.length) warn(`${f.id}: could not derive a hallway from its outline`);
  for (const c of hl) lines.push({ coords: c, flags: FLAG_HALL, kind: "corridor", hallOf: f.id, drawn: true });
}
const doorPoints = new Map(); // place id → [lng, lat][] (snapped onto the outline)
function nearestOnLines(pt, cands) {
  let best = null;
  for (const L of cands) for (let i = 0; i < L.coords.length - 1; i++) {
    const pr = projectOnSegment(pt, L.coords[i], L.coords[i + 1]);
    if (!best || pr.d < best.d) best = pr;
  }
  return best;
}
for (const f of places) {
  const doors = layout.get(f.id)?.doors ?? [];
  if (!doors.length) continue;
  if (f.geometry.type === "Point") { err(`places.yaml → ${f.id}: doors need a building outline`); continue; }
  const own = lines.filter((L) => L.hallOf === f.id);
  const others = lines.filter((L) => L.hallOf !== f.id && !L.doorOf);
  const pts = [];
  for (const d of doors) {
    const onOutline = nearestOnOutline(d, f.geometry);
    if (onOutline.d > 8) warn(`${f.id}: door ${JSON.stringify(d)} is ${Math.round(onOutline.d)} m from the outline`);
    const D = r6(onOutline.q);
    if (pts.some((q) => dist(q, D) < 1)) continue;
    pts.push(D);
    if (own.length) {
      const h = nearestOnLines(D, own);
      lines.push({ coords: [D, r6(h.q)], flags: FLAG_HALL, kind: "corridor", doorOf: f.id, drawn: true });
    }
    const out = nearestOnLines(D, others);
    if (out && out.d <= DOOR_REACH_M) lines.push({ coords: [D, r6(out.q)], flags: 0, kind: "footway", doorOf: f.id, drawn: true });
    else if (!own.length) warn(`${f.id}: door ${JSON.stringify(D)} has no road or walkway within ${DOOR_REACH_M} m`);
  }
  doorPoints.set(f.id, pts);
}
// Snap line endpoints that land on another line's interior (T-junctions without a shared node).
const SNAP_M = 3;
for (const L of lines) {
  for (const end of [0, L.coords.length - 1]) {
    const pt = L.coords[end];
    let best = null;
    for (const M of lines) {
      if (M === L) continue;
      for (let i = 0; i < M.coords.length - 1; i++) {
        const pr = projectOnSegment(pt, M.coords[i], M.coords[i + 1]);
        if (pr.d <= SNAP_M && (!best || pr.d < best.pr.d)) best = { M, i, pr };
      }
    }
    if (best) {
      const q = best.pr.q;
      L.coords[end] = q;
      if (best.pr.t > 0 && best.pr.t < 1) best.M.coords.splice(best.i + 1, 0, q);
    }
  }
}
for (const L of lines) addLine(L.coords, L.flags, L.hallOf ?? null);

// Components before places are attached: doors/hallways only count if they reach the main network.
const ufParent = nodes.map((_, i) => i);
const ufFind = (x) => (ufParent[x] === x ? x : (ufParent[x] = ufFind(ufParent[x])));
for (const [a, b] of edges) ufParent[ufFind(a)] = ufFind(b);
const compSize = new Map();
nodes.forEach((_, i) => compSize.set(ufFind(i), (compSize.get(ufFind(i)) ?? 0) + 1));
const mainRoot = [...compSize.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

// Connect each place to the network.
//  1. Hallway: enter at the hallway point nearest the building's centre (doors lead there).
//  2. Doors: every door is an entry node; routing picks the best one.
//  3. Otherwise: link the outline vertex nearest to any path (buildings without mapped doors).
const placeNodes = {};
const inMain = (i) => i !== undefined && ufFind(i) === mainRoot;
for (const f of places) {
  const geom = f.geometry;
  const hall = [...(hallNodes.get(f.id) ?? [])].filter(inMain);
  if (hall.length) {
    const c = f.properties.center;
    const n = hall.reduce((b, i) => (dist(nodes[i], c) < dist(nodes[b], c) ? i : b));
    placeNodes[f.id] = [n];
    f.properties.door = nodes[n];
    f.properties.walkGapM = 0;
    continue;
  }
  const doorNodes = (doorPoints.get(f.id) ?? []).map((d) => nodeIndex.get(keyOf(d))).filter(inMain);
  if (doorNodes.length) {
    placeNodes[f.id] = doorNodes;
    f.properties.door = nodes[doorNodes[0]];
    f.properties.doors = doorNodes.map((i) => nodes[i]);
    f.properties.walkGapM = 0;
    continue;
  }
  const probes = geom.type === "Point" ? [geom.coordinates] : ringsOf(geom).flat();
  let best = null;
  for (const pt of probes) {
    for (const e of edges) {
      if (e[3] & (16 | 32)) continue;
      const pr = projectOnSegment(pt, nodes[e[0]], nodes[e[1]]);
      if (!best || pr.d < best.pr.d) best = { pt, e, pr };
    }
  }
  if (!best) { warn(`${f.id}: no path network to connect to`); continue; }
  // If this place's own point is a network node (e.g. the gate), use it directly.
  const existing = nodeIndex.get(keyOf(r6(best.pr.q)));
  let n;
  if (existing !== undefined) n = existing;
  else if (best.pr.t <= 0.02) n = best.e[0];
  else if (best.pr.t >= 0.98) n = best.e[1];
  else {
    // split edge
    n = nodeAt(best.pr.q);
    const [a, b, , flags] = best.e;
    adj.delete(a < b ? `${a}-${b}` : `${b}-${a}`);
    edges.splice(edges.indexOf(best.e), 1);
    addEdge(a, n, flags);
    addEdge(n, b, flags);
  }
  if (best.pr.d > MAX_CONNECTOR_M) warn(`${f.id}: nearest path is ${Math.round(best.pr.d)} m away. Add a footpath in data/overrides/paths.geojson`);
  // door point: where the place touches the walk link (polygon vertex closest to the path)
  f.properties.door = r6(best.pt);
  f.properties.walkGapM = Math.round(best.pr.d);
  placeNodes[f.id] = [n];
}

// Connectivity check
const parent = nodes.map((_, i) => i);
const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
for (const [a, b] of edges) parent[find(a)] = find(b);
const comps = new Map();
for (const [id, ns] of Object.entries(placeNodes)) {
  const r = find(ns[0]);
  if (!comps.has(r)) comps.set(r, []);
  comps.get(r).push(id);
}
if (comps.size > 1) {
  const groups = [...comps.values()].sort((a, b) => b.length - a.length);
  warn(`Path network is split into ${comps.size} disconnected groups. Places outside the largest group can't be routed to:\n      ` +
    groups.slice(1).map((g) => g.join(", ")).join("\n      "));
}

// ── output ──
const version = new Date().toISOString().slice(0, 10).replaceAll("-", ".");
const campus = {
  type: "FeatureCollection",
  campus: {
    id: "bupc",
    name: "Bicol University Polangui Campus",
    shortName: "BU Polangui",
    address: "San Juan Street, Centro Occidental, Polangui, Albay",
    boundary: boundary.map(r6),
    bounds,
    center: r6([(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2]),
    defaultStart: "main-gate",
    datasetVersion: version,
    osmFetched: raw.fetched ?? null,
  },
  features: places,
  // Hand-mapped walkways and hallways, drawn on the map (roads come from the basemap).
  paths: lines.filter((L) => L.drawn).map((L) => ({ kind: L.kind, coords: L.coords.map(r6) })),
};
const graph = { version, nodes, edges, placeNodes };

for (const w of warnings) console.warn("⚠ " + w);
if (errors.length) {
  for (const e of errors) console.error("✖ " + e);
  console.error(`\nData build failed with ${errors.length} error(s).`);
  process.exit(1);
}
await mkdir(p("public/data/"), { recursive: true });
await writeFile(p("public/data/campus.json"), JSON.stringify(campus));
await writeFile(p("public/data/graph.json"), JSON.stringify(graph));
const identified = places.filter((f) => f.properties.identified).length;
console.log(`✔ Data ${version}: ${places.length} places (${identified} identified), ${nodes.length} path nodes, ${edges.length} edges, ${comps.size} network group(s)`);
