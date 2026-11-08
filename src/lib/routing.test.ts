import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { Router } from "./routing";
import { createSearch } from "./search";
import type { Campus, Graph } from "../types";

const campus: Campus = JSON.parse(readFileSync("public/data/campus.json", "utf8"));
const graph: Graph = JSON.parse(readFileSync("public/data/graph.json", "utf8"));
const places = campus.features;
const router = new Router(graph, places);
const byId = new Map(places.map((p) => [p.id, p]));

function routeBetween(a: string, b: string) {
  const A = byId.get(a)!, B = byId.get(b)!;
  const end = (p: typeof A) => (p.properties.walkGapM ? p.properties.door : undefined);
  return router.route({
    fromNodes: router.nodesForPlace(a)!, toNodes: router.nodesForPlace(b)!,
    fromPoint: end(A), toPoint: end(B),
    fromLabel: A.properties.name, toLabel: B.properties.name, excludeLandmarks: [a, b],
  });
}

describe("routing", () => {
  it("enters a multi-door place through its nearest door", () => {
    const doors = byId.get("volleyball-court")!.properties.doors!;
    expect(doors.length).toBeGreaterThan(1);
    for (const from of ["main-gate", "nursing-department", "clinic"]) {
      const r = routeBetween(from, "volleyball-court")!;
      const end = r.path[r.path.length - 1];
      expect(doors.some((d) => d[0] === end[0] && d[1] === end[1]), from).toBe(true);
    }
  });

  it("puts the photocopy shop among the Entrep stalls and reaches the court through the Salceda passage", () => {
    expect(byId.get("photocopy-shop")!.properties.parentId).toBe("entrep-stalls");
    const r = routeBetween("photocopy-shop", "volleyball-court")!;
    expect(r.distanceM).toBeLessThan(45); // straight across the road and through the open passage
  });

  it("walks the Nursing loop hallway into its inner court", () => {
    const r = routeBetween("canteen", "nursing-court")!;
    expect(r.steps.some((s) => /Nursing hallway/.test(s.text))).toBe(true);
  });

  it("uses mapped hallways and says so (student sketch 2026-11-08)", () => {
    const indoor = graph.edges.filter((e) => e[3] & 32).length;
    expect(indoor).toBeGreaterThan(10);
    const texts = places.flatMap((p) => routeBetween("main-gate", p.id)?.steps.map((s) => s.text) ?? []);
    expect(texts.some((t) => /hallway/.test(t))).toBe(true);
  });

  it("reaches every place from the Main Gate (TC-NAV-03)", () => {
    for (const p of places) {
      if (p.id === "main-gate") continue;
      const r = routeBetween("main-gate", p.id);
      expect(r, p.id).not.toBeNull();
      expect(r!.distanceM).toBeLessThan(700); // campus is ~290 × 360 m
    }
  });

  it("is symmetric (TC-NAV-02)", () => {
    const pairs = [["main-gate", "gymnasium"], ["registrar", "nursing-department"], ["canteen", "clinic"]];
    for (const [a, b] of pairs) {
      const ab = routeBetween(a, b)!, ba = routeBetween(b, a)!;
      expect(Math.abs(ab.distanceM - ba.distanceM)).toBeLessThanOrEqual(5);
    }
  });

  it("produces depart and arrive steps", () => {
    const r = routeBetween("main-gate", "gymnasium")!;
    expect(r.steps[0].icon).toBe("depart");
    expect(r.steps.at(-1)!.icon).toBe("arrive");
    expect(r.minutes).toBeGreaterThanOrEqual(1);
  });

  it("routes 1,000 random pairs quickly (TC-NAV-07)", () => {
    const ids = places.map((p) => p.id);
    const t = performance.now();
    for (let i = 0; i < 1000; i++) {
      routeBetween(ids[i % ids.length], ids[(i * 7 + 3) % ids.length]);
    }
    expect(performance.now() - t).toBeLessThan(1500);
  });
});

describe("search", () => {
  const search = createSearch(places);
  const first = (q: string) => search(q)[0]?.place.id;
  it.each([
    ["registrar", "registrar"],
    ["regstrar", "registrar"],
    ["library", "salceda-building"],
    ["GYM", "gymnasium"],
    ["clinic", "clinic"],
    ["educ", "salceda-building"],
    ["computer studies", "cesd"],
    ["guidance", "center-for-student-services"],
    ["entrep", "entrepreneurship-department"],
    ["tech dept", "technology-department"],
    ["nstp building", "nstp-building"],
    ["waiting shed", "waiting-shed"],
    ["volleyball", "volleyball-court"],
    ["badminton", "nursing-court"],
    ["stalls", "entrep-stalls"],
    ["xerox", "photocopy-shop"],
  ])("%s → %s", (q, id) => expect(first(q)).toBe(id));

  it("returns nothing for gibberish (TC-SRC-06)", () => expect(search("xyzzyqq")).toHaveLength(0));
});
