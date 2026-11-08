# ADR-0003: Campus data lives in the repo, imported from OSM plus overrides

- **Status:** Accepted
- **Date:** 2026-11-07

## Context
The old system's data was in a private Firestore and is not recoverable from the source. OpenStreetMap already maps BU Polangui (relation 13027320): the boundary, 27 building outlines, roads, a gate and 14 named points. Many buildings are unnamed, and OSM lacks rooms, aliases and descriptions.

## Decision
- **Geometry** comes from OSM via a scripted Overpass import, committed as `data/raw/`.
- **Knowledge** (names, aliases, rooms, offices, entrances, verification) lives in `data/overrides/places.yaml`, keyed by our stable `id` and bound to OSM element IDs.
- A build script merges, validates and emits runtime JSON. CI blocks invalid data.
- A weekly OSM sync opens a PR. Imports are never auto-deployed.
- Corrections should also be contributed **upstream to OSM**.

## Alternatives considered
| Option | Why not |
|---|---|
| Hand-draw everything in our own GeoJSON | Duplicates OSM work; drifts; loses community updates |
| Use OSM live at runtime (Overpass from the browser) | Slow, rate-limited, not offline, no review gate |
| Edit OSM only, no overrides | Can't store rooms or descriptions; slow to get our edits accepted |

## Consequences
- ✅ Git history is the audit log; PR review is the admin panel
- ✅ Re-imports are safe (overrides survive)
- ❌ Our dataset is a derivative database under **ODbL**: attribution and share-alike are required (see NOTICE)
