import { Info, List, Map as MapIcon, Search } from "lucide-react";
import type { View } from "../lib/url";
import { href } from "../lib/url";

const TABS = [
  { key: "map", label: "Map", Icon: MapIcon, to: href.home() },
  { key: "search", label: "Search", Icon: Search, to: href.search() },
  { key: "places", label: "Places", Icon: List, to: href.places() },
  { key: "more", label: "More", Icon: Info, to: href.about() },
] as const;

function activeTab(view: View): string {
  switch (view.name) {
    case "search": return "search";
    case "places": return "places";
    case "about": return "more";
    default: return "map"; // home, place and route all live on the map
  }
}

/** Phone bottom navigation (56 px + safe area), like the tab bars of mainstream mobile apps. */
export function TabBar({ view }: { view: View }) {
  const active = activeTab(view);
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ key, label, Icon, to }) => (
        <a key={key} href={to} className={`tab${active === key ? " active" : ""}`} aria-current={active === key ? "page" : undefined}>
          <Icon size={24} strokeWidth={active === key ? 2.2 : 1.8} aria-hidden />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}
