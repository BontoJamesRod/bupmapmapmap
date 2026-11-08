import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Campus, LngLat, Place, PlaceProps } from "../types";
import { CATEGORY, SURFACE, UNIDENTIFIED_COLOR } from "../lib/categories";
import { outlineRings } from "../lib/geo";

const ll = ([lng, lat]: LngLat): L.LatLngTuple => [lat, lng];
const LABEL_MIN_ZOOM = 18;
const ROUTE_COLOR = "#C2593A"; // clay accent, matches the UI
const USER_COLOR = "#2F6FDB";

/** Padding that keeps framed content out from under the floating panel and search bar. */
function viewPadding(extra = 0, focus = false): L.FitBoundsOptions {
  const desktop = window.innerWidth >= 900;
  // Phone: the bottom sheet's current height (set by BottomSheet). When focusing a place or route
  // the sheet opens to half, so reserve at least that much.
  const sheet = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sheet-h")) || 148;
  const below = 56 + Math.max(sheet, focus ? (window.innerHeight - 56) * 0.5 : 0);
  return desktop
    ? { paddingTopLeft: [420 + extra, 72 + extra], paddingBottomRight: [24 + extra, 24 + extra] }
    // phone: top bar above; tab bar + bottom sheet below
    : { paddingTopLeft: [12 + extra, 72 + extra], paddingBottomRight: [12 + extra, Math.round(below) + extra] };
}

interface Props {
  campus: Campus;
  selectedId: string | null;
  route: LngLat[] | null;
  routeEnds: { from: LngLat; to: LngLat } | null;
  userPos: { coord: LngLat; accuracy: number } | null;
  onSelect: (id: string | null) => void;
  /** Bumped by the parent to request "fit the whole campus". */
  resetSignal: number;
}

export function MapView({ campus, selectedId, route, routeEnds, userPos, onSelect, resetSignal }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const shapes = useRef(new Map<string, L.Path>());
  const routeLayer = useRef<L.LayerGroup | null>(null);
  const userLayer = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const campusBounds = L.latLngBounds(
    [campus.campus.bounds[1], campus.campus.bounds[0]],
    [campus.campus.bounds[3], campus.campus.bounds[2]],
  );

  // Create the map once.
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, {
      zoomControl: false,
      maxBounds: campusBounds.pad(1.5),
      maxBoundsViscosity: 0.8,
      minZoom: 16,
      maxZoom: 21,
      zoomSnap: 0.5,
    });
    map.current = m;
    m.fitBounds(campusBounds, viewPadding());
    L.control.zoom({ position: "bottomright" }).addTo(m);

    // Basemap is a backdrop only — campus layers below render from our own data even if tiles fail.
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxNativeZoom: 19,
      maxZoom: 21,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      className: "basemap",
      crossOrigin: true, // CORS tiles can be cached offline by the service worker (no opaque responses)
    }).addTo(m);

    // Campus boundary
    L.polygon(campus.campus.boundary.map(ll), {
      color: "#8F897A", weight: 1.5, dashArray: "6 6", fill: true, fillColor: "#F5F4EE", fillOpacity: 0.25, interactive: false,
    }).addTo(m);

    // Buildings, then open areas on top (a court can sit inside a building), then points
    const rank = (f: Place) => (f.geometry.type === "Point" ? 2 : f.properties.kind === "area" ? 1 : 0);
    const ordered = [...campus.features].sort((a, b) => rank(a) - rank(b));
    for (const f of ordered) {
      const p = f.properties;
      const surface = p.kind === "area" && p.surface ? SURFACE[p.surface] : undefined;
      const color = surface?.stroke ?? (p.identified ? CATEGORY[p.category].color : UNIDENTIFIED_COLOR);
      let shape: L.Path;
      if (f.geometry.type !== "Point") {
        // one polygon per outline part (Salceda is three OSM outlines forming one U-shaped building)
        shape = L.polygon(outlineRings(f).map((r) => [r.map(ll)]), {
          color, weight: 1.5, fillColor: surface?.fill ?? color, fillOpacity: baseOpacity(p),
          dashArray: p.kind === "area" && !surface ? "5 4" : p.identified ? undefined : "3 3",
        });
      } else {
        shape = L.circleMarker(ll(f.geometry.coordinates), {
          radius: 7, color: "#fff", weight: 2, fillColor: color, fillOpacity: 1,
        });
      }
      shape.on("click", (e) => { L.DomEvent.stopPropagation(e); onSelectRef.current(p.id); });
      const tip = {
        permanent: true, direction: "center" as const, className: `bldg-label${p.identified ? "" : " unknown"}`,
        offset: (f.geometry.type === "Point" ? [0, -14] : [0, 0]) as L.PointTuple,
      };
      if (p.labelAt) L.tooltip(tip).setLatLng(ll(p.labelAt)).setContent(labelHtml(f)).addTo(m);
      else shape.bindTooltip(labelHtml(f), tip);
      shape.addTo(m);
      shapes.current.set(p.id, shape);
    }

    // Walkways and hallways: dark dashes on a white casing so they read on any fill
    for (const w of campus.paths ?? []) {
      const indoor = w.kind === "corridor";
      const pts = w.coords.map(ll);
      // Colours come from CSS (.walk-*) so they follow the light/dark theme.
      L.polyline(pts, { className: "walk-casing", weight: 6, lineCap: "round", lineJoin: "round", interactive: false }).addTo(m);
      L.polyline(pts, {
        className: indoor ? "walk-dash indoor" : "walk-dash", weight: 2.5,
        dashArray: indoor ? "7 6" : "3 6", lineCap: "butt", interactive: false,
      }).addTo(m);
    }

    routeLayer.current = L.layerGroup().addTo(m);
    userLayer.current = L.layerGroup().addTo(m);

    m.on("click", () => onSelectRef.current(null));
    const syncLabels = () => el.current?.classList.toggle("labels-hidden", m.getZoom() < LABEL_MIN_ZOOM);
    m.on("zoomend", syncLabels);
    syncLabels();

    return () => { m.remove(); map.current = null; shapes.current.clear(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campus]);

  // Selection highlight + fly-to
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    for (const [id, s] of shapes.current) {
      const sel = id === selectedId;
      if (s instanceof L.Polygon) {
        const pr = campus.features.find((x) => x.id === id)?.properties;
        const base = pr ? baseOpacity(pr) : 0.45;
        s.setStyle({ weight: sel ? 4 : 1.5, fillOpacity: sel ? Math.max(0.6, base + 0.3) : base });
      }
      if (sel) s.bringToFront();
      s.getElement()?.classList.toggle("selected", sel);
    }
    if (selectedId && !route) {
      const f = campus.features.find((x) => x.id === selectedId);
      if (f) {
        const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
        const b = f.geometry.type === "Point" ? L.latLng(ll(f.geometry.coordinates)).toBounds(40) : L.latLngBounds(outlineRings(f).flat().map(ll));
        m.flyToBounds(b, { ...viewPadding(40, true), maxZoom: 19, animate: !reduce, duration: 0.5 });
      }
    }
  }, [selectedId, route, campus]);

  // Route
  useEffect(() => {
    const m = map.current, layer = routeLayer.current;
    if (!m || !layer) return;
    layer.clearLayers();
    if (!route || route.length < 2) return;
    const pts = route.map(ll);
    L.polyline(pts, { color: "#fff", weight: 10, opacity: 0.9, lineCap: "round", lineJoin: "round" }).addTo(layer);
    L.polyline(pts, { color: ROUTE_COLOR, weight: 6, lineCap: "round", lineJoin: "round" }).addTo(layer);
    if (routeEnds) {
      L.circleMarker(ll(routeEnds.from), { radius: 8, color: "#fff", weight: 3, fillColor: ROUTE_COLOR, fillOpacity: 1 }).addTo(layer);
      L.marker(ll(routeEnds.to), {
        icon: L.divIcon({ className: "dest-pin", html: "<span></span>", iconSize: [28, 36], iconAnchor: [14, 34] }),
        keyboard: false,
      }).addTo(layer);
    }
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    m.flyToBounds(L.latLngBounds(pts), { ...viewPadding(32, true), maxZoom: 19.5, animate: !reduce, duration: 0.6 });
  }, [route, routeEnds]);

  // User location
  useEffect(() => {
    const layer = userLayer.current;
    if (!layer) return;
    layer.clearLayers();
    if (!userPos) return;
    L.circle(ll(userPos.coord), { radius: userPos.accuracy, color: USER_COLOR, weight: 1, fillOpacity: 0.12, interactive: false }).addTo(layer);
    L.circleMarker(ll(userPos.coord), { radius: 7, color: "#fff", weight: 3, fillColor: USER_COLOR, fillOpacity: 1, interactive: false }).addTo(layer);
  }, [userPos]);

  // Reset view
  useEffect(() => {
    if (resetSignal && map.current) map.current.flyToBounds(campusBounds, { ...viewPadding(), duration: 0.5 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  return <div ref={el} className="map" role="application" aria-label="Campus map. Use the search box or the place list for keyboard access." />;
}

function labelHtml(f: Place): string {
  const p = f.properties;
  const text = p.identified ? p.shortName ?? p.name : "?";
  const span = document.createElement("span");
  span.textContent = text; // escape — never inject data as HTML
  return span.outerHTML;
}

function baseOpacity(p: PlaceProps): number {
  if (p.kind === "area") return p.surface ? SURFACE[p.surface]?.opacity ?? 0.3 : 0.16;
  return p.identified ? 0.45 : 0.25;
}
