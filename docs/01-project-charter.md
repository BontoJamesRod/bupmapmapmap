# 01 — Project Charter

| | |
|---|---|
| **Project** | BUP Navi: Campus Navigation for Bicol University Polangui Campus |
| **Document version** | 1.0 (draft) |
| **Date** | 2026-11-07 |
| **Status** | Proposed |

## 1. Background

In 2025–2026, a 2nd-year capstone team built **SCNavi**, a "smart campus" portal: login with a BU email, AI schedule parsing, room occupancy, events, an admin portal and a floor-plan builder. It ran on a single team member's Firebase and Google Cloud accounts. As a result:

- The campus data (building markers, floor plans) lives only in that one Firestore project. The source code contains none of it.
- Anyone else who wants to run, demo or extend the system cannot do so.
- Requiring a login keeps out exactly the people who need directions most: visitors, parents, applicants and enrollees who don't have a BU account yet.

## 2. Vision

> Anyone standing at the BU Polangui gate, or anywhere on campus, can find where they need to go within 10 seconds of opening a link, with no account and no app install.

## 3. Goals

| ID | Goal | Measure |
|---|---|---|
| G1 | Accurate campus map | 100% of buildings on campus have an outline and a confirmed name |
| G2 | Fast wayfinding | A first-time user finds a building and starts directions in ≤ 3 taps |
| G3 | Zero barriers | No login, no install, no paid API, works on low-end Android over 3G/4G |
| G4 | Community-maintained | Any student can fix data through a pull request without touching code |
| G5 | Sustainable at no cost | Hosting and operations cost ₱0 per month |

## 4. Scope

### In scope (v1.0)

- Map of BU Polangui Campus: boundary, building outlines, internal roads and walkways, gates
- Building and point-of-interest (POI) directory: offices, departments, services, and a text list of notable rooms per building
- Search with aliases and typo tolerance
- Walking directions within campus
- Device location ("You are here"), processed only on the device
- Deep links and QR codes
- Offline support (PWA)
- Accessibility: keyboard and screen reader support, plus a list view

### Out of scope (explicit non-goals)

| Excluded | Reason |
|---|---|
| User accounts, login, roles | The core principle is open access |
| Floor-plan builder and indoor maps | High effort, low data availability; a text room list covers the need |
| Real-time room occupancy | Needs live data entry and a backend |
| Class schedules, COR parsing, notifications | Personal data; outside the wayfinding focus |
| Admin portal | Replaced by Git pull requests and review |
| Other BU campuses | Possible later; the data model allows it (see [Roadmap](09-roadmap.md)) |
| Outdoor navigation *to* the campus | Defer to Google Maps or OSM apps via an external link |

## 5. Stakeholders

| Stakeholder | Interest | Role |
|---|---|---|
| Freshmen and transferees | Find classrooms and offices in the first weeks | Primary user |
| Visitors, parents, applicants | Find the Registrar, Admin or Clinic without an account | Primary user |
| Current students | Find rarely used offices; share directions | User and data contributor |
| Faculty and staff | Point people to their office | User and data source |
| Maintainers (project team) | Code quality, data accuracy | Developers and reviewers |
| Campus administration | Accurate public representation of the campus | Informal reviewer (see risk R4) |
| OpenStreetMap community | Upstream data source | Data partner |

## 6. Success metrics (first semester after launch)

- ≥ 95% of named campus places verified on site by a maintainer
- ≥ 90% task success in usability tests ("Find the Registrar", "Go to the Gym from the gate")
- Lighthouse scores of ≥ 90 for Performance and ≥ 95 for Accessibility on mobile
- ≥ 5 data corrections merged from people outside the core team

## 7. Constraints

- **Budget:** ₱0. Free-tier hosting (GitHub Pages) and free data (OSM) only.
- **Team:** student developers working part-time.
- **Data:** official BU site plans are not public, so data comes from OSM plus on-site verification.
- **Licensing:** OSM data is ODbL, so we must attribute it and share derived data alike.

## 8. Assumptions

- Most users have a smartphone with a modern browser (Chrome on Android, Safari on iOS).
- Phone GPS is accurate to roughly 5–15 m outdoors. That's good enough for building-level navigation, but not for indoor positioning.
- The campus layout changes slowly, a few edits per year.

## 9. Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | About 10 buildings are unnamed in OSM | Certain | High | On-site survey checklist ([Inventory §4](10-campus-data-inventory.md)) |
| R2 | Walkways are missing from OSM, so routes cut through buildings or take odd detours | High | Medium | Survey and draw footpaths; validate routes in field tests |
| R3 | GPS jitter near buildings | Medium | Low | Accuracy circle, snap to path, manual "start from" picker |
| R4 | University objects to unofficial use of the name or logo | Low | Medium | No BU logo, a clear "not official" disclaimer, and openness to endorsement |
| R5 | Volunteer contributors push wrong data | Medium | Medium | Schema validation in CI plus required maintainer review |
| R6 | OSM public tile servers rate-limit us | Low | Medium | Tile layer is optional; campus layers render from our own data (see [ADR-0002](adr/0002-leaflet-and-openstreetmap.md)) |

## 10. Approval

| Role | Name | Date |
|---|---|---|
| Project lead | _TBD_ | |
| Developer(s) | _TBD_ | |
| Adviser (optional) | _TBD_ | |
