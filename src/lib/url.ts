import { useEffect, useState } from "react";
import type { Endpoint, LngLat } from "../types";

/** App screens, derived entirely from the URL hash so every view is shareable. */
export type View =
  | { name: "home" }
  | { name: "place"; id: string }
  | { name: "route"; from: Endpoint | null; to: string }
  | { name: "about" }
  | { name: "qr"; id: string }
  | { name: "search" }
  | { name: "places" };

export function parseHash(hash: string): View {
  const h = hash.replace(/^#\/?/, "");
  const [path, qs = ""] = h.split("?");
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  const params = new URLSearchParams(qs);
  if (parts[0] === "place" && parts[1]) return { name: "place", id: parts[1] };
  if (parts[0] === "about") return { name: "about" };
  if (parts[0] === "qr" && parts[1]) return { name: "qr", id: parts[1] };
  if (parts[0] === "search") return { name: "search" };
  if (parts[0] === "places") return { name: "places" };
  if (parts[0] === "route" && params.get("to")) {
    return { name: "route", from: parseEndpoint(params.get("from")), to: params.get("to")! };
  }
  return { name: "home" };
}

export function parseEndpoint(s: string | null): Endpoint | null {
  if (!s) return null;
  const m = /^@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(s);
  if (m) return { kind: "point", coord: [Number(m[2]), Number(m[1])], label: "Your location" };
  return { kind: "place", id: s };
}

export function endpointParam(e: Endpoint): string {
  if (e.kind === "place") return e.id;
  const [lng, lat] = e.coord;
  return `@${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export const href = {
  home: () => "#/",
  place: (id: string) => `#/place/${encodeURIComponent(id)}`,
  route: (to: string, from?: Endpoint | null) =>
    `#/route?${from ? `from=${encodeURIComponent(endpointParam(from))}&` : ""}to=${encodeURIComponent(to)}`,
  about: () => "#/about",
  qr: (id: string) => `#/qr/${encodeURIComponent(id)}`,
  search: () => "#/search",
  places: () => "#/places",
};

export const go = (h: string) => { if (location.hash !== h) location.hash = h; };

export function useView(): View {
  const [view, setView] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => setView(parseHash(location.hash));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return view;
}

export function shareUrl(h: string): string {
  return `${location.origin}${location.pathname}${h}`;
}

export type { LngLat };
