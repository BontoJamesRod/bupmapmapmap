# 09 — Roadmap

Durations assume part-time student work (~8–10 h/week). Each milestone ends with a demo and a tagged release.

| Milestone | Goal | Key deliverables | Est. |
|---|---|---|---|
| **M0 · Docs** ✅ | Agree on what we're building | This documentation set; repo created; issue templates | 1 wk |
| **M1 · Data foundation** ✅ | A trustworthy campus dataset | `import-osm`, `build-data`, schema, validation in CI; overrides for all 16 named places; placeholder IDs for unnamed buildings | 1–2 wk |
| **M2 · On-site survey** 🟡 (sketches in; 5 buildings left) | Fill the gaps | Survey checklist completed: every building named, entrances located, missing footpaths drawn, photos; changes pushed upstream to OSM | 1 wk (parallel with M3) |
| **M3 · Map MVP** ✅ | See the campus | Vite+React scaffold; Leaflet map; boundary/buildings/paths/POIs layers; labels; category colors; place card; deep links; GitHub Pages deploy | 2 wk |
| **M4 · Search** ✅ | Find anything | Fuse.js index with aliases/rooms; combobox UI; quick picks; empty state and report link | 1 wk |
| **M5 · Directions** ✅ | Walk there | Graph builder; A\* in a worker; route rendering; distance/time; text steps with landmarks; start picker | 2 wk |
| **M6 · Location & sharing** ✅ | Start from where I am; send to a friend | Geolocation with snapping, off-campus handling; Web Share; QR page | 1 wk |
| **M7 · PWA, a11y, polish** 🟡 (PWA, dark mode, list view done; e2e/axe pending) | Works for everyone, everywhere | Offline precache, install, update prompt; list view; a11y audit fixes; dark mode; Lighthouse budgets | 1–2 wk |
| **M8 · Field test & launch (v1.0)** | Proven on the ground | Field test protocol; usability test; fixes; v1.0.0 release; QR signs proposal to campus admin | 1 wk |

**Total: about 10–12 weeks to v1.0.**

## Post-v1 ideas (backlog, unprioritized)
- Filipino / Bikol language toggle
- "Covered route" and "accessible route" preferences (needs survey data)
- Events layer from a static `events.yaml`
- Self-hosted vector basemap (PMTiles) for full independence and nicer styling
- More BU campuses (Daraga, East, West, Tabaco, Guinobatan, Gubat) via `campusId`
- Indoor floor levels for key buildings, if plans become available
- An embeddable widget for the BU Polangui Facebook page or website

## Definition of Done (every feature)
- [ ] Requirement IDs referenced in the PR
- [ ] Unit and E2E tests added; CI green
- [ ] Works at 360 px and on desktop; light and dark
- [ ] Keyboard and screen-reader checked
- [ ] Docs updated if behavior or data format changed
