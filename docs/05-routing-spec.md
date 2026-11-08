# 05 — Navigation & Routing Specification

| | |
|---|---|
| **Version** | 1.0 (draft) |
| **Date** | 2026-11-07 |
| **Implements** | FR-NAV-01…11, FR-LOC-01…05 |

## 1. Goals
- Produce the **shortest sensible walking route** between any two points on campus.
- Run **entirely in the browser**, in under 50 ms, with no network connection.
- Produce **human-friendly instructions** that use landmarks, not compass headings.

## 2. Scale
BU Polangui spans about 290 m × 360 m (bbox 13.29500–13.29764 N, 123.48329–123.48664 E). The longest walk on campus is about 500 m, or about 7 minutes. The expected graph size is **< 1,000 nodes and < 2,000 edges**. At this size A\* with a binary heap is effectively instant, so no routing engine (OSRM, GraphHopper) is needed. See [ADR-0004](adr/0004-client-side-search-and-routing.md).

## 3. Graph model

### 3.1 Construction (build time, `build-graph.ts`)

1. **Collect lines:** OSM `highway=*` ways inside the campus (residential, service, footway, path, steps, the roundabout), plus `overrides/paths.geojson`.
2. **Split at intersections:** wherever two lines share a vertex or cross, create a node. Snap vertices within **1.0 m** of each other into one node.
3. **Densify:** split edges longer than **25 m** so that snapping a GPS position lands close to the user's real location.
4. **Connect entrances:** for each place entrance (or its centroid if no entrance is defined), add a node and a connector edge to the **nearest point on the nearest edge**. Split that edge if needed. Connector edges are capped at 40 m; longer ones fail validation.
5. **Weights:** `cost = length_m × factor`.

| Edge type | Factor | Rationale |
|---|---|---|
| footway / path | 1.00 | Preferred for pedestrians |
| service / residential (vehicle road) | 1.10 | Walkable, slightly discouraged |
| steps | 1.30 (∞ when "accessible" is on) | |
| connector (entrance link) | 1.00 | |
| covered = yes | × 0.8 when "covered route" is on | Rain preference |

6. **Ignore `oneway`:** pedestrians can walk both ways, including around the roundabout.
7. **Validate:** a single connected component; every place reachable (see [Data Model §7](04-data-model.md#7-validation-ci-gate)).
8. **Emit** `graph.json` with node coordinates rounded to **6 decimals** (~0.1 m).

### 3.2 Distance
Haversine for edge lengths. An equirectangular approximation is acceptable at runtime for heuristics: at 13.3° N, 1° lon ≈ 108.3 km and 1° lat ≈ 110.6 km, so the error over 500 m is < 0.1%.

## 4. Algorithm

```
route(start, goal, prefs):
  S = resolve(start)    # place id → its node(s); coordinate → snap()
  G = resolve(goal)
  run A* from all S simultaneously (multi-source) to any node in G
    g(n)  = accumulated cost
    h(n)  = minFactor × straight-line distance(n, nearest goal node)
  return path, distance (true metres, not cost), steps
```

- **Admissibility:** `minFactor` is the smallest edge factor in play: 1.0 normally, 0.8 when the "covered" preference is on. Scaling by it keeps the heuristic from overestimating, so A\* stays optimal.
- **Multi-entrance places:** a building with several entrances maps to several nodes. The route goes to whichever entrance is nearest.
- **Priority queue:** a binary heap, about 40 lines of code with no dependency.
- **Complexity:** O(E log V). In practice under 1 ms for this graph.

### 4.1 Snapping a free coordinate (GPS or map tap)
1. If the point is > 500 m from the campus boundary, it is **off campus**. Offer external directions to the Main Gate (FR-LOC-03).
2. Otherwise, project it onto the nearest edge (Turf `nearestPointOnLine`) and insert a temporary node splitting that edge. Add the walk from the raw point to the snapped point as a "leg 0" (drawn dashed).
3. If GPS accuracy is > 30 m, show "Location is approximate" and suggest picking a start manually.

### 4.2 Re-routing while walking (FR-LOC-04, Could)
- `watchPosition` with `enableHighAccuracy: true` and `maximumAge: 5000`.
- Progress = the projection of the position onto the current route polyline.
- Off-route when the distance from the route is > 25 m for 2 consecutive fixes. Re-route then, throttled to once per 10 s.
- Arrival when within 15 m of the goal node. Show "You have arrived at …".

## 5. Output

```ts
interface RouteResult {
  from: { label: string; coord: [number, number] };
  to:   { placeId: string; label: string; coord: [number, number] };
  path: [number, number][];        // polyline, [lng, lat]
  distanceM: number;               // rounded to 5 m for display
  durationMin: number;             // ceil(distanceM / 72), min 1
  steps: Step[];
  warnings: ("approximate-start" | "uses-steps" | "uses-road")[];
}
interface Step {
  type: "depart" | "continue" | "turn" | "roundabout" | "pass" | "arrive";
  modifier?: "left" | "right" | "slight-left" | "slight-right" | "straight" | "u-turn";
  distanceM: number;
  landmark?: string;               // "Canteen", "Gymnasium"
  text: string;                    // rendered, i18n
  at: [number, number];
}
```

## 6. Instruction generation

1. **Simplify** the path into segments at nodes where the bearing changes by > 30°.
2. **Classify each turn** by the bearing change Δ:

   | Δ | Instruction |
   |---|---|
   | < 20° | continue straight (merged into the previous step) |
   | 20–45° | slight left / right |
   | 45–135° | turn left / right |
   | > 135° | U-turn (should be rare; flag in tests) |

3. **Roundabout:** if the path enters edges tagged `junction=circular`, emit one step, "At the roundabout, take the exit toward {landmark}".
4. **Landmarks:** for each step, find the nearest named place within 20 m of the turn node. Prefer places with category `food`, `sports`, `administrative` or `gate`, which are visible and well known. Use the landmark in the text: "Turn left after the **Canteen**". For straight stretches longer than 40 m, emit "Pass the {landmark} on your {side}" for landmarks within 15 m.
5. **Depart and arrive:**
   - "Start at the **Main Gate** and walk toward the **Guard House**."
   - "**Salceda Building** is on your right. The Library is on the **2nd floor**." The floor comes from the room or office data.
6. **Merge** consecutive steps shorter than 8 m.

Example (illustrative, to be validated on site):

> 1. Start at the **Main Gate**, walk west along the campus road.
> 2. Pass the **Medical & Dental Clinic** on your right. 40 m
> 3. At the **roundabout**, continue toward the **Center for Student Services**. 60 m
> 4. Turn left. The **Gymnasium** is ahead. 50 m
> 5. Arrive at **Gymnasium**. Total 210 m · about 3 min

## 7. Testing hooks
- `tests/fixtures/routes.json`: a list of `{from, to, expectedMaxDistanceM, mustPass?: [placeId], mustNot?: [placeId]}` cases recorded during the field survey.
- Property tests: route(a, b) distance equals route(b, a) distance (within 1 m); the route never crosses a building footprint; the triangle inequality holds.
- Performance test: 1,000 random routes in < 1 s in Node.
