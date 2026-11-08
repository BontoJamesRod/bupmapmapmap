import Fuse, { type FuseResultMatch } from "fuse.js";
import type { Place } from "../types";

export interface SearchHit {
  place: Place;
  /** Extra context when the match was an office/room/department, e.g. "Library · 2nd floor". */
  detail: string | null;
}

const ordinal = (n: number) => (n === 1 ? "Ground" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);
export const floorLabel = (n?: number | null) => (n ? `${ordinal(n)} floor` : null);

export function createSearch(places: Place[]) {
  const fuse = new Fuse(places, {
    includeMatches: true,
    ignoreLocation: true,
    threshold: 0.34,
    minMatchCharLength: 2,
    keys: [
      { name: "properties.name", weight: 1 },
      { name: "properties.shortName", weight: 1 },
      { name: "properties.aliases", weight: 0.9 },
      { name: "properties.offices.name", weight: 0.7 },
      { name: "properties.rooms.name", weight: 0.7 },
      { name: "properties.rooms.code", weight: 0.7 },
      { name: "properties.departments", weight: 0.6 },
      { name: "properties.description", weight: 0.15 },
    ],
  });

  return (query: string, limit = 8): SearchHit[] => {
    const q = query.trim();
    if (q.length < 2) return [];
    return fuse.search(q, { limit }).map((r) => ({ place: r.item, detail: describeMatch(r.item, r.matches) }));
  };
}

function describeMatch(place: Place, matches: readonly FuseResultMatch[] | undefined): string | null {
  const m = matches?.[0];
  if (!m || m.refIndex === undefined) return null;
  const p = place.properties;
  if (m.key === "properties.offices.name") {
    const o = p.offices[m.refIndex];
    return o ? [o.name, floorLabel(o.floor)].filter(Boolean).join(" · ") : null;
  }
  if (m.key === "properties.rooms.name" || m.key === "properties.rooms.code") {
    const r = p.rooms[m.refIndex];
    return r ? [r.name ?? r.code, floorLabel(r.floor)].filter(Boolean).join(" · ") : null;
  }
  if (m.key === "properties.departments") return p.departments[m.refIndex] ?? null;
  return null;
}
