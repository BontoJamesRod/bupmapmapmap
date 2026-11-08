import { ChevronDown, CircleHelp } from "lucide-react";
import type { Category, Place } from "../types";
import { CATEGORY } from "../lib/categories";
import { href } from "../lib/url";

/** Map-free list of every place: the accessible way to browse the campus (FR-DIR-01). */
export function PlaceList({ places }: { places: Place[] }) {
  const groups = new Map<Category | "unknown", Place[]>();
  for (const p of places) {
    const k = p.properties.identified ? p.properties.category : "unknown";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(p);
  }
  const order = [...(Object.keys(CATEGORY) as Category[]), "unknown" as const].filter((k) => groups.has(k));
  return (
    <nav aria-label="All campus places" className="place-list">
      {order.map((k) => {
        const Icon = k === "unknown" ? CircleHelp : CATEGORY[k].Icon;
        const items = groups.get(k)!.sort((a, b) => a.properties.name.localeCompare(b.properties.name));
        return (
          <details key={k} open={k === "academic"}>
            <summary>
              <span className="group-icon" style={{ color: k === "unknown" ? undefined : CATEGORY[k].color }} aria-hidden>
                <Icon size={16} />
              </span>
              <span className="group-name">{k === "unknown" ? "Not yet identified" : CATEGORY[k].label}</span>
              <span className="count">{items.length}</span>
              <ChevronDown className="chev" size={16} aria-hidden />
            </summary>
            <ul className="plain links">
              {items.map((p) => (
                <li key={p.id}><a href={href.place(p.id)}>{p.properties.name}</a></li>
              ))}
            </ul>
          </details>
        );
      })}
    </nav>
  );
}
