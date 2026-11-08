# ADR-0004: Client-side fuzzy search and A\* routing, with no routing service

- **Status:** Accepted
- **Date:** 2026-11-07

## Context
The campus is about 290 m × 360 m, with roughly 30 places and an estimated < 1,000 path nodes. We need offline search and directions with zero backend.

## Decision
- **Search:** Fuse.js over a prebuilt index (names, aliases, departments, offices, rooms). Weighted keys: name 1.0, aliases 0.9, offices/rooms 0.7, departments 0.6, description 0.2.
- **Routing:** a prebuilt `graph.json` and a custom A\* (binary heap, multi-source/multi-target), run in a **Web Worker**. Turn-by-turn instructions are generated with landmarks (see [Routing Spec](../05-routing-spec.md)).

## Alternatives considered
| Option | Why not |
|---|---|
| OSRM / GraphHopper / Valhalla | Server required, or a heavy WASM build; overkill for this graph size |
| Google Directions API | Key + billing; poor coverage of campus footpaths |
| MiniSearch / Lunr | Fine choices; Fuse.js picked for simple typo tolerance at small N |
| Dijkstra | Equivalent here; A\* is the same code plus a heuristic |

## Consequences
- ✅ Instant (< 50 ms), offline, no dependency for routing
- ✅ Fully testable in Node with fixtures
- ❌ Route quality depends entirely on our path data, so field testing is mandatory
