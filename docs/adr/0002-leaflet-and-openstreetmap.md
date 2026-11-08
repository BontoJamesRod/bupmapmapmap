# ADR-0002: Leaflet with OpenStreetMap, campus layers drawn from our own data

- **Status:** Accepted
- **Date:** 2026-11-07

## Context
Google Maps requires an API key with a billing account, and its terms restrict mixing its basemap with other data sources. We need building outlines, custom styling and offline use.

## Decision
- Use **Leaflet** (+ `react-leaflet`) as the map engine.
- Render the **campus boundary, buildings, paths and POIs from our bundled GeoJSON**. This is the core of the map.
- Use a raster basemap (OSM-based tiles) as an **optional backdrop**. The provider is configurable in `src/config.ts`, and the app is fully usable when tiles fail (FR-MAP-08).

## Alternatives considered
| Option | Why not (for v1) |
|---|---|
| Google Maps JS API | Key + billing; ToS limits; heavier |
| MapLibre GL + vector tiles | Nicer and supports rotation, but ~200 KB+ and needs a vector tile source; a candidate for v2 via self-hosted PMTiles |
| Pure SVG campus drawing, no basemap | Very light, but loses real-world context (streets outside the gate) |

## Consequences
- ✅ No key, ~40 KB library, mature, accessible keyboard controls
- ✅ Campus rendering is independent of any tile provider
- ❌ Must respect the OSM tile usage policy: attribution, no bulk prefetch, valid Referer. For heavy traffic, switch providers or self-host.
- ❌ No map rotation (acceptable)
