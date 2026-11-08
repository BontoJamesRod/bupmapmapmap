# 04 — Data Model & Data Pipeline

| | |
|---|---|
| **Version** | 1.0 (draft) |
| **Date** | 2026-11-07 |
| **Related** | [SRS §6](02-srs.md#6-data-requirements-summary) · [Routing Spec](05-routing-spec.md) · [Inventory](10-campus-data-inventory.md) · [ADR-0003](adr/0003-data-in-repo-from-osm.md) |

## 1. Principles

1. **OSM is the geometry source; overrides are the knowledge source.** Outlines and roads come from OpenStreetMap. Names, aliases, rooms and descriptions that OSM doesn't have live in our `overrides/` files.
2. **Stable IDs.** A place's `id` (e.g. `salceda-building`) never changes once published, because URLs and QR codes depend on it.
3. **Re-import safety.** Pulling fresh OSM data must never erase manual work. Overrides are keyed by our `id`, which maps to an OSM element.
4. **Provenance.** Every place records where its data came from and whether someone verified it on site.
5. **Human-editable.** Contributors edit YAML, not code.

## 2. Entities

```mermaid
erDiagram
  CAMPUS ||--o{ PLACE : contains
  CAMPUS ||--|| BOUNDARY : has
  CAMPUS ||--o{ PATH : has
  PLACE ||--o{ ROOM : lists
  PLACE ||--o{ ENTRANCE : has
  PLACE }o--o| PLACE : "located in (parent)"
  PATH }o--o{ NODE : "connects"
  ENTRANCE ||--|| NODE : "is a"

  CAMPUS { string id; string name; bbox bounds; point center; string datasetVersion }
  PLACE { string id; string name; string kind; string category; geometry geom; string parentId; bool verified }
  ROOM { string code; string name; int floor; string type }
  ENTRANCE { string id; point location; bool main; bool accessible }
  PATH { string id; string kind; bool covered; bool steps; geometry line }
  NODE { string id; point location }
```

- **Place `kind`:** `building` (polygon) · `poi` (point, may sit inside a building through `parentId`) · `gate` · `area` (e.g. a field or parking lot)
- **Place `category`:** `academic` · `administrative` · `student-services` · `health` · `food` · `sports` · `residential` · `utility` · `security` · `commercial`

## 3. Runtime file: `campus.json`

A GeoJSON `FeatureCollection` with campus metadata at the top level.

```jsonc
{
  "type": "FeatureCollection",
  "campus": {
    "id": "bupc",
    "name": "Bicol University Polangui Campus",
    "shortName": "BU Polangui",
    "address": "San Juan Street, Centro Occidental, Polangui, Albay",
    "center": [123.4849, 13.2963],              // [lng, lat], GeoJSON order
    "bounds": [123.48329, 13.29500, 123.48664, 13.29764],
    "defaultStart": "main-gate",
    "datasetVersion": "2026.11.07",
    "osmSnapshot": "2026-11-07T00:00:00Z"
  },
  "features": [
    {
      "type": "Feature",
      "id": "salceda-building",
      "geometry": { "type": "Polygon", "coordinates": [[ /* … */ ]] },
      "properties": {
        "id": "salceda-building",
        "kind": "building",
        "name": "Salceda Building",
        "shortName": "Salceda",
        "category": "academic",
        "aliases": ["library", "aklatan"],
        "description": "Houses the campus library on the 2nd floor.",
        "floors": 2,
        "departments": [],
        "offices": [{ "name": "BU Polangui Campus Library", "floor": 2 }],
        "rooms": [
          { "code": "LIB", "name": "Library", "floor": 2, "type": "library" }
        ],
        "entrances": [
          { "id": "salceda-building/e1", "coord": [123.48545, 13.29612], "main": true }
        ],
        "hours": null,
        "photo": null,
        "osm": { "type": "way", "id": 551347988 },
        "source": ["osm", "web:buls-library-page"],
        "verified": false,
        "updated": "2026-11-07"
      }
    }
  ]
}
```

### Field reference: Place

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | string `^[a-z0-9]+(-[a-z0-9]+)*$` | ✔ | Stable slug; unique |
| `kind` | enum | ✔ | building / poi / gate / area |
| `name` | string 1–80 | ✔ | Official or most common name, in Title Case |
| `shortName` | string ≤ 20 | | Map label |
| `category` | enum | ✔ | See §2 |
| `aliases` | string[] | | Search synonyms, lowercase |
| `description` | string ≤ 300 | | Plain text, no HTML |
| `parentId` | string | | For a POI inside a building (Registrar → Admin Building) |
| `floor` | int | | For POIs: which floor of the parent (1 = ground) |
| `floors` | int | | For buildings |
| `departments` | string[] | | Academic units housed there |
| `offices` | `{name, floor?}`[] | | |
| `rooms` | `Room`[] | | See below |
| `entrances` | `Entrance`[] | | If missing, the build uses the centroid snapped to the nearest path |
| `hours` | string (OSM `opening_hours` syntax) | | e.g. `Mo-Fr 08:00-17:00` |
| `photo` | `{src, alt, credit}` | | Stored in `public/photos/` |
| `osm` | `{type, id}` | | Link to the source element |
| `source` | string[] | ✔ | `osm`, `survey:<date>`, `web:<ref>`, `override` |
| `verified` | bool | ✔ | `true` only after an on-site check |
| `updated` | date | ✔ | Last change |

**Room:** `{ code: string, name?: string, floor?: int, type?: "classroom"|"lab"|"office"|"library"|"cr"|"other" }`

**Entrance:** `{ id: string, coord: [lng, lat], main?: bool, accessible?: bool }`

## 4. Runtime file: `graph.json`

The walkable network, precomputed at build time. Full details are in the [Routing Spec](05-routing-spec.md#3-graph-model).

```jsonc
{
  "version": "2026.11.07",
  "nodes": [[123.48477, 13.29618], /* index = node id */ ],
  "edges": [
    // [from, to, lengthMeters, flags]  flags: bit0 covered, bit1 steps, bit2 vehicle-road, bit3 oneway-for-vehicles(ignored on foot)
    [0, 1, 18.4, 0]
  ],
  "placeNodes": { "salceda-building": [12], "main-gate": [0] },
  "names": { "3": "Roundabout" }                       // landmark labels for instructions
}
```

## 5. Source files (edited by humans)

### 5.1 `data/overrides/places.yaml`

Keyed by our stable `id`. It binds to an OSM element and adds or overrides fields.

```yaml
salceda-building:
  osm: way/551347988
  name: Salceda Building
  category: academic
  aliases: [library, aklatan]
  floors: 2
  offices:
    - { name: BU Polangui Campus Library, floor: 2 }
  verified: false
  source: [web:buls-library-page]

registrar:
  osm: node/13644761491
  kind: poi
  name: Registrar's Office
  category: administrative
  parentId: administration-building   # resolved if the node lies inside that footprint
  aliases: [registrar, records, enrollment, tor]

bldg-a01:                              # placeholder for an unnamed footprint
  osm: way/551347950
  name: "Unidentified Building A01"
  category: academic
  verified: false
```

**Merge rules (`build-data.ts`):**
1. For each OSM element in the campus area, find an override whose `osm:` matches it. If none matches, auto-generate an `id` from `name`, or `bldg-<osmid>` when there is no name, and **fail CI if the result is a new unnamed building** so a maintainer must triage it.
2. Override fields replace OSM-derived fields. Arrays are replaced, not concatenated.
3. A POI node lying inside a building polygon gets that building's `id` as its `parentId` automatically, unless overridden.
4. An override whose `osm:` element no longer exists in OSM produces a **warning plus a CI failure**, so deleted buildings can't silently linger. The override can be marked `retired: true` to keep the redirect (old URLs then show "This place no longer exists").
5. An override with no `osm:` key is a manual-only place, e.g. a newly built structure not yet in OSM. It must include geometry.

**Building layout fields** (added 2026-11-08):

```yaml
salceda-building:
  osm: way/551347988
  parts: [way/551347989, way/551347987]   # extra OSM outlines that are the same building → MultiPolygon
  hallway: true                           # draw a hallway down the middle, following the building's shape
  doors: [[123.4856, 13.296094], ...]     # [lng, lat]; snapped onto the outline
```

- **`parts`**: one building that OSM maps as several outlines, e.g. Salceda's two wings. The place becomes a `MultiPolygon`: one search result and one highlight. The label sits on the first (main) outline.
- **`hallway: ring`** (with optional `hallwayInset`, default 7 m): a closed loop square to the building, for a building built around an inner court (Nursing).
- **`labelAt: [lng, lat]`**: where to put the map label when the centre is taken, e.g. by an inner court.
- **`retired: true`** with `osm:`: claims an outdated OSM footprint so it is not drawn, e.g. the old photocopy-shop outline near the gate.
- **`hallway: true`**: `scripts/lib/hallway.mjs` derives the hallway from the outline.
  - It rasterises the outline at 0.5 m, closing gaps under 4 m between parts.
  - It thins the result to a centreline and cuts the corner forks.
  - It then simplifies and squares the line to the building's axis.
  - The result follows the shape: a bar gives one straight line, an L gives an L, a U gives a U. Edges are flagged `32` (indoor) and `1` (covered).
- **`doors`**: each point is snapped onto the outline and joined with straight lines:
  - inward, to the building's own hallway (when it has one);
  - outward, to the nearest road, walkway or other building's hallway, within 35 m.

  Routing treats every door as an entrance and uses the best one. A building with a hallway is "arrived at" on its hallway, at the point nearest its centre.
- Buildings with neither field connect from their nearest outline corner, as before.

### 5.2 `data/overrides/paths.geojson`
Free-standing walkways that are missing from OSM and are not just a door's link to the road, such as a shortcut across a field. Each one is a `LineString` with properties `{ kind: "footway" | "corridor", covered?: bool, steps?: bool, note }`. Draw these as straight segments; hallways and door links come from `places.yaml` instead. They should ideally be added to OSM upstream later.

## 6. OSM import

### 6.1 Query (Overpass QL)

```
[out:json][timeout:60];
rel(13027320);                 // Bicol University Polangui Campus
out geom;                      // boundary geometry
map_to_area->.c;
(
  way(area.c)[building];
  node(area.c)[name];
  node(area.c)[barrier=gate];
  node(area.c)[entrance];
  way(area.c)[highway];
  way(area.c)[amenity];
  way(area.c)[leisure];
);
out geom;
```

### 6.2 Tag mapping

| OSM tag | Our field |
|---|---|
| `name` | `name` |
| `short_name`, `alt_name`, `old_name` | `shortName`, `aliases` |
| `building=*` | `kind: building` |
| `building:levels` | `floors` |
| `amenity=school/university`, `office=*` | category hint: academic / administrative |
| `amenity=clinic/doctors/dentist` | `health` |
| `shop=*`, `amenity=cafe/restaurant/canteen` | `food` / `commercial` |
| `leisure=sports_centre`, name contains GYM | `sports` |
| `barrier=gate`, `entrance=*` | `kind: gate` / entrance |
| `highway=footway/path/service/residential/steps` | path graph edges |
| `covered=yes` | edge flag: covered |
| `opening_hours` | `hours` |
| `wheelchair` | entrance `accessible` |

### 6.3 Cadence
- `npm run data:import` refreshes `data/raw/osm-campus.geojson` locally.
- A scheduled workflow (weekly) runs the import and **opens a PR** if anything changed. A human reviews the diff before merging.

## 7. Validation (CI gate)

| Check | Fails build when |
|---|---|
| JSON Schema (`ajv`) | Any required field is missing, an enum is invalid, or the id format is bad |
| Unique IDs | Duplicate `id` |
| Containment | A building centroid lies outside the campus boundary (+30 m tolerance) |
| Unnamed buildings | An OSM building has no override and no name |
| Orphan overrides | An override references a missing OSM element and is not `retired` |
| Graph connectivity | More than one connected component, or any place has no reachable node |
| Text safety | Any string contains `<` or `>` followed by letters (HTML-like) |
| Size budget | `campus.json` + `graph.json` + index > 150 KB gzipped |
| Stable IDs | An `id` present in the last release is missing and not marked `retired` |

## 8. Versioning
- `datasetVersion` = build date `YYYY.MM.DD` (with suffix `.N` for multiple builds per day).
- Shown on the About page; included in issue reports.
- `CHANGELOG-data.md` is generated automatically from the diff (places added, renamed or removed).

## 9. Licensing of data
- Geometry and OSM-derived attributes are **ODbL**. Our combined `campus.json` is a derivative database and is also published under ODbL.
- Overrides contributed by people are licensed ODbL when contributed (stated in CONTRIBUTING), which lets us push improvements back to OSM.
- Photos: contributor's own work under CC BY-SA 4.0, with credit stored in `photo.credit`.
