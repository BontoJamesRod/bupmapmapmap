# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/). App versions use SemVer. Campus data is versioned by date (shown on the About screen).

## [0.3.0] - 2026-11-08

### Added
- **Phone version.** On screens up to 899 px wide the app switches to a mobile app layout:
  - A **bottom tab bar** (Map · Search · Places · More), 56 px tall plus the home-indicator inset, like mainstream social and map apps.
  - A **draggable bottom sheet** that snaps to peek, half and full. Swipe up to expand, pull down at the top of the content to collapse, and flicks are supported. Each screen opens at a sensible height.
  - A **full-screen search** page with the keyboard up, popular places, and 60 px result rows.
  - A **Places** tab, a browsable list of everything.
  - A **More** tab: About, plus an **Appearance** setting (Device / Light / Dark).
- **Standard touch sizes** on phones:
  - icon targets of at least 44 px;
  - 48 px buttons, fields and selects;
  - list rows of 48–60 px;
  - 16 px body and input text, which also stops iOS zooming into the search field;
  - safe-area padding for notches and home indicators.
- The map frames places and routes above the sheet. The OpenStreetMap credit sits above the sheet so it stays visible.

## [0.2.0] - 2026-11-08

### Added
- **New design.** Warm ivory and clay palette, serif headings (Source Serif 4), Inter for UI text, line icons, and a light/dark/system theme switch. Fonts are self-hosted, so there are no third-party requests.
- **Offline / PWA.** A service worker precaches the app and campus data, and caches the map tiles you've viewed (capped at 600). It comes with an install manifest, PNG icons and an offline notice.
- **Printable QR signs** for every place (`#/qr/<id>`). They link straight to walking directions.
- **Building layout model** in `places.yaml`:
  - `hallway: true` gives a centreline hallway that follows the building's shape (U, L, bar).
  - `hallway: ring` gives a loop around an inner court.
  - `doors` lists entrances.
  - `parts` merges outlines that belong to one building.
  - `surface` colours an open area as grass, court or paved.
  - `labelAt` moves a building's label.
- **Places:** Nursing Court, Volleyball Court, Grass Field, Entrepreneurship Stalls, NSTP Building, Waiting Shed, Technology Dept, Entrepreneurship Dept and Annex.
- **Directions:** "Go straight into the X hallway" steps. A building with several doors is entered through the nearest one.
- **Security and robustness:**
  - Content-Security-Policy in production.
  - Error boundary, data-load retry, page titles per screen.
  - `/` shortcut for search.
- **CI:** Node 24, an offline-worker check, auto "Report it" links, a weekly OpenStreetMap sync PR, Dependabot.
- **Tests:** hallway geometry and URL routing (33 tests in total).

### Changed
- **Salceda Building** is now one U-shaped building; the two OSM "wings" are merged in.
- **Photocopy Shop** moved to the Entrepreneurship stalls. Its outdated OSM outline near the gate is retired.
- **Grass Field** outline fitted to the actual lawn. It no longer overlaps Admin or the roads.
- Walkways and hallways are drawn as dashed lines with a casing, so they're visible on any background.

## [0.1.0] - 2026-11-08
- First working prototype: OSM data pipeline, Leaflet map, fuzzy search, A* walking directions, place cards, list view.
