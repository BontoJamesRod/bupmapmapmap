# 07 — Test Plan

| | |
|---|---|
| **Version** | 1.0 (draft) |
| **Date** | 2026-11-07 |
| **Covers** | All FR and NFR in the [SRS](02-srs.md) |

## 1. Objectives
- Verify every **Must** requirement before v1.0 release, and every **Should** requirement or document it as deferred.
- Prove the **data is correct on the ground**, not just valid in software.
- Keep regressions out with automated gates in CI.

## 2. Test levels

| Level | Tool | Scope | Runs |
|---|---|---|---|
| Static | `tsc`, ESLint, Prettier | Types, lint, formatting | Every push |
| Data validation | `ajv` + custom checks | Schema, IDs, graph connectivity, size ([Data Model §7](04-data-model.md#7-validation-ci-gate)) | Every push |
| Unit | Vitest | `search`, `astar`, `snap`, `instructions`, `url-state`, `merge` | Every push |
| Component | Vitest + Testing Library | SearchBox, PlaceCard, DirectionsPanel | Every push |
| End-to-end | Playwright (Chromium, WebKit, mobile emulation) | User journeys UC-01…UC-04 | Every PR |
| Accessibility | `@axe-core/playwright` + manual screen-reader pass | WCAG 2.1 AA | Every PR (auto); per release (manual) |
| Performance | Lighthouse CI | LCP, JS size, scores | Every PR (budgets) |
| Offline | Playwright `context.setOffline(true)` | FR-OFF-01 | Every PR |
| **Field test** | Humans on campus with phones | Route correctness, GPS, landmark wording | Before each data release |
| Usability | 5–8 participants, think-aloud | Task success, time | Before v1.0 |

## 3. Key test cases

### 3.1 Search

| ID | Input | Expected first result | Req |
|---|---|---|---|
| TC-SRC-01 | `registrar` | Registrar's Office | FR-SRC-01 |
| TC-SRC-02 | `regstrar` (typo) | Registrar's Office | FR-SRC-02 |
| TC-SRC-03 | `library` | Salceda Building (Library, 2F) | FR-SRC-01/04 |
| TC-SRC-04 | `GYM` | Gymnasium | FR-SRC-02 |
| TC-SRC-05 | `clinic` | Medical & Dental Clinic | FR-SRC-01 |
| TC-SRC-06 | `xyzzy` | Empty state with report link | FR-SRC-07 |
| TC-SRC-07 | 50 keystrokes timed on a throttled CPU (4×) | Each ≤ 100 ms | FR-SRC-03 |

### 3.2 Routing

| ID | Case | Expected | Req |
|---|---|---|---|
| TC-NAV-01 | Main Gate → Gymnasium | Route found; distance within ±10% of field measurement | FR-NAV-04/06 |
| TC-NAV-02 | Route A → B vs B → A | Distances equal within 1 m | FR-NAV-04 |
| TC-NAV-03 | Every place → every place (all pairs) | All routes found (graph connected) | DR-04 |
| TC-NAV-04 | Any route | Never intersects a building polygon except at entrances | FR-NAV-04 |
| TC-NAV-05 | GPS point 30 m off path | Snapped; dashed leg 0 drawn | §4.1 Routing |
| TC-NAV-06 | GPS point 2 km away | Off-campus prompt | FR-LOC-03 |
| TC-NAV-07 | 1,000 random routes | Total < 1 s (Node) | NFR-PERF-03 |
| TC-NAV-08 | Route through the roundabout | One "roundabout" step, not several turns | Routing §6 |
| TC-NAV-09 | Isolated destination (fixture) | "No route" message plus straight-line distance | FR-NAV-10 |

### 3.3 Location and privacy

| ID | Case | Expected | Req |
|---|---|---|---|
| TC-LOC-01 | Page load | No permission prompt | FR-LOC-01 |
| TC-LOC-02 | Permission denied | Start = Main Gate; one-time hint; no console errors | FR-LOC-05 |
| TC-LOC-03 | Record all network requests during a GPS session | None contain lat/lng values | FR-LOC-02 |

### 3.4 Sharing and URLs

| ID | Case | Expected | Req |
|---|---|---|---|
| TC-SHR-01 | Open `/#/place/gymnasium` cold | Gym card open, map centered | FR-SHR-01 |
| TC-SHR-02 | Open `/#/route?from=main-gate&to=registrar` | Route shown | FR-SHR-02 |
| TC-SHR-03 | Open `/#/place/does-not-exist` | Toast; home screen | §8.7 Architecture |
| TC-SHR-04 | Print QR page | Fits one A4 page; QR decodes to the correct URL | FR-SHR-04 |

### 3.5 Resilience

| ID | Case | Expected | Req |
|---|---|---|---|
| TC-REL-01 | Block the tile host | Campus layers and routing still work | FR-MAP-08 |
| TC-REL-02 | Offline after the first visit | Search, card and routing work | FR-OFF-01 |
| TC-REL-03 | New deploy while the app is open | "Update available" prompt | FR-OFF-04 |

### 3.6 Accessibility

| ID | Case | Expected |
|---|---|---|
| TC-A11Y-01 | axe-core on Home, Card, Directions, List, About | 0 critical/serious |
| TC-A11Y-02 | Keyboard only: complete UC-01 and UC-02 | Possible, with visible focus |
| TC-A11Y-03 | TalkBack (Android) + NVDA (Windows): UC-01 via the list view | Completable |
| TC-A11Y-04 | 200% zoom, 320 px width | No loss of content or function |

## 4. Field test protocol (on campus)

**Equipment:** 2+ phones (one Android, one iPhone if available), the printed route fixture sheet, a measuring app or a step counter.

For each route in `tests/fixtures/routes.json`, at least 15 routes covering every building:
1. Stand at the start. Open the shared route link.
2. Record whether the start location is correct and the GPS accuracy shown.
3. Walk the route following **only** the app's text instructions.
4. Record:
   - Did you arrive? (Y/N)
   - Any confusing step? (text)
   - Does the route cut through walls, fences or grass with no real path? (Y/N)
   - Measured distance
5. Photograph each building's main entrance and confirm its name and signage. This fills the [Inventory §4 checklist](10-campus-data-inventory.md#4-on-site-survey-checklist).
6. File issues for each defect with the label `field-test`.

**Exit criteria:** ≥ 95% of routes arrive correctly and no route crosses an impassable barrier.

## 5. Usability test
- **Participants:** 5–8 people, including at least 2 who have never visited BU Polangui.
- **Tasks:**
  - Find the Registrar
  - Get directions from the gate to the Nursing Department
  - Share the route to the Gym
  - Find where the library is
- **Measures:** task success, time on task, errors, SUS (System Usability Scale) score.
- **Target:** ≥ 90% task success; SUS ≥ 75.

## 6. Traceability matrix

| Requirement | Test cases |
|---|---|
| FR-MAP-01/02 | E2E `home.spec.ts`, TC-REL-01 |
| FR-MAP-08 | TC-REL-01 |
| FR-SRC-01…07 | TC-SRC-01…07 |
| FR-DET-01…05 | E2E `place.spec.ts` |
| FR-NAV-01…10 | TC-NAV-01…09, field test |
| FR-LOC-01…05 | TC-LOC-01…03, TC-NAV-05/06 |
| FR-SHR-01…05 | TC-SHR-01…04 |
| FR-DIR-01/02 | TC-A11Y-03 |
| FR-OFF-01…04 | TC-REL-02/03 |
| FR-FBK-01 | E2E `report.spec.ts` |
| NFR-PERF-* | Lighthouse CI budgets, TC-SRC-07, TC-NAV-07 |
| NFR-A11Y-* | TC-A11Y-01…04 |
| NFR-SEC-02 | TC-LOC-03 |
| NFR-SEC-06 | Data validation "text safety", unit test on renderers |
| NFR-LEG-01 | E2E: attribution visible on Home and About |
| DR-01…04 | Data validation suite |

## 7. Entry and exit criteria for a release
- **Entry:** feature-complete for the milestone; data freeze.
- **Exit:**
  - All CI gates green
  - 0 open `severity:critical` or `severity:high` bugs
  - Field test exit criteria met (data releases)
  - Lighthouse budgets met
  - Manual accessibility pass signed off

## 8. Defect severity

| Severity | Definition | Example |
|---|---|---|
| Critical | App unusable, or sends the user to the wrong place | Route leads to the wrong building |
| High | Core feature broken for some users | Search fails on Safari |
| Medium | Feature degraded; workaround exists | Landmark text wrong |
| Low | Cosmetic | Label overlap at one zoom level |
