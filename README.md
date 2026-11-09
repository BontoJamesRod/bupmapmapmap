# BUP Navi

**An open, no-login campus navigation map for Bicol University Polangui Campus.**

Find any building, office or room at BU Polangui, and get walking directions to it, from any phone or laptop. No account, no install, no tracking.

> Status: **Release candidate (v0.3).** Map, search, building details, walking directions through hallways, offline mode and printable QR signs all work. Five small buildings still need names. See the [Changelog](CHANGELOG.md) and [Roadmap](docs/09-roadmap.md).

## Features

- **Campus map.** Every building outline is drawn and labelled, plus courts, the grass field, and the Entrepreneurship stalls.
- **Search with typos and nicknames.** Try "regstrar", "library", "xerox" or "badminton".
- **Building cards.** Each shows departments, offices, rooms with their floors, and verification status.
- **Walking directions.** Routes run through mapped hallways and doors, with time, distance and step-by-step text such as "Go straight into the CESD hallway".
- **Start from your location.** Uses GPS on https only, and your location never leaves your phone.
- **Shareable links** for every place and route, plus **printable QR signs** to post at buildings.
- **Works offline** after the first visit, and can be installed to the home screen as a PWA.
- **Built for phones.** It has a bottom tab bar, a draggable bottom sheet, full-screen search, and standard 44–48 px touch targets.
- **Light and dark themes**, keyboard search on desktop (press `/`), and a map-free list of every place.

## Run it

```bash
npm install
npm run dev          # builds campus data, then serves on http://localhost:5173 (and your LAN IP for phones)
npm test             # routing, hallway, search and URL tests
npm run check        # everything CI runs: data validation, typecheck, tests, production build
npm run preview      # serve the production build (offline mode only works here, not in dev)
npm run data:import  # refresh OpenStreetMap data (optional)
```

Edit campus info in [`data/overrides/places.yaml`](data/overrides/places.yaml). Restart the dev server to pick up the changes. The data model is described in [docs/04](docs/04-data-model.md):
- `hallway: true` (or `ring`) draws a hallway that follows the building's shape;
- `doors:` lists the entrances;
- `parts:` merges outlines that belong to one building.

## Deploy (GitHub Pages)

1. Create a GitHub repository and push this folder to its `main` branch.
2. In the repo, open **Settings → Pages → Source** and pick **GitHub Actions**.
3. Every push to `main` then validates the data, runs the tests, builds and deploys to `https://<user>.github.io/<repo>/`. The "Report it" links point at the repo automatically.
4. Optional: to let the weekly OpenStreetMap sync open PRs, enable **Settings → Actions → General → Allow GitHub Actions to create and approve pull requests**.

Details: [docs/08-deployment.md](docs/08-deployment.md).

---

## Why this exists

New students, transferees, parents and visitors regularly get lost looking for the Registrar, the library (2nd floor, Salceda Building) or a specific lab. Campus knowledge is passed around by word of mouth. BUP Navi puts that knowledge into one public map that anyone can open and anyone can help keep accurate.

This project is an independent successor to **SCNavi** (2nd-year capstone, Blockers United, 2025–2026). SCNavi was a login-based portal built on Firebase. BUP Navi keeps the core idea, campus navigation, and drops everything that required accounts. See [Project Charter](docs/01-project-charter.md).

## Documentation

| # | Document | What it covers |
|---|---|---|
| 01 | [Project Charter](docs/01-project-charter.md) | Vision, goals, scope, stakeholders, success metrics |
| 02 | [Software Requirements Specification](docs/02-srs.md) | Functional and non-functional requirements, use cases |
| 03 | [System Architecture](docs/03-architecture.md) | Tech stack, components, data flow, diagrams |
| 04 | [Data Model & Pipeline](docs/04-data-model.md) | Campus data schema, OpenStreetMap import, validation |
| 05 | [Navigation & Routing Spec](docs/05-routing-spec.md) | Path graph, shortest-path algorithm, directions |
| 06 | [UI/UX Specification](docs/06-ui-ux-spec.md) | Screens, user flows, wireframes, accessibility |
| 07 | [Test Plan](docs/07-test-plan.md) | Test strategy, cases, acceptance criteria |
| 08 | [Deployment & Operations](docs/08-deployment.md) | CI/CD, hosting, releases, monitoring |
| 09 | [Roadmap](docs/09-roadmap.md) | Milestones and deliverables |
| 10 | [Campus Data Inventory](docs/10-campus-data-inventory.md) | What we already know about BU Polangui, from research |
| — | [Architecture Decision Records](docs/adr/) | Why we chose what we chose |
| — | [Contributing](CONTRIBUTING.md) | How to fix a building name, add a room, or contribute code |

## Tech at a glance

Vite · React · TypeScript · Leaflet · Fuse.js · OpenStreetMap data · service worker (PWA) · GitHub Pages · GitHub Actions

No backend, no database server and no paid API keys.

## Licensing and attribution

- **Code:** Apache License 2.0. See [LICENSE](LICENSE).
- **Map data:** © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the Open Database License (ODbL). Our campus dataset is derived from OSM and is published under ODbL as well. See [NOTICE](NOTICE).
- **Inspired by** SCNavi by Blockers United (Apache 2.0).

Bicol University's name is used only to describe the campus this tool covers. This is a student project and is **not an official Bicol University service**.
