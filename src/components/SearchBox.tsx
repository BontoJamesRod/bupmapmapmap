import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { Place } from "../types";
import type { SearchHit } from "../lib/search";
import { CATEGORY } from "../lib/categories";

interface Props {
  search: (q: string) => SearchHit[];
  onPick: (place: Place) => void;
  placeholder?: string;
}

export function SearchBox({ search, onPick, placeholder = "Search buildings, offices, rooms…" }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const hits = useMemo(() => search(q), [q, search]);
  const showList = open && q.trim().length >= 2;

  // Close the dropdown whenever the screen changes (map tap, link, back button).
  useEffect(() => {
    const close = () => { setQ(""); setOpen(false); };
    window.addEventListener("hashchange", close);
    return () => window.removeEventListener("hashchange", close);
  }, []);

  // "/" focuses search from anywhere (unless typing in a field already).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) { e.preventDefault(); input.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pick = (h: SearchHit) => {
    onPick(h.place);
    setQ("");
    setOpen(false);
    input.current?.blur();
  };

  return (
    <div className={`search${showList ? " open" : ""}`}>
      <Search className="search-icon" size={18} aria-hidden />
      <input
        ref={input}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && hits[active] ? `${listId}-${active}` : undefined}
        aria-label="Search buildings, offices and rooms"
        placeholder={placeholder}
        value={q}
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter" && hits[active]) { e.preventDefault(); pick(hits[active]); }
          else if (e.key === "Escape") { setQ(""); setOpen(false); }
        }}
      />
      {q && (
        <button className="search-clear" aria-label="Clear search" onMouseDown={(e) => e.preventDefault()} onClick={() => { setQ(""); input.current?.focus(); }}>
          <X size={16} aria-hidden />
        </button>
      )}
      {showList && (
        <ul className="results" id={listId} role="listbox" aria-label="Search results">
          {hits.map((h, i) => {
            const p = h.place.properties;
            const cat = CATEGORY[p.category];
            const [title, ...rest] = h.detail ? h.detail.split(" · ") : [p.name];
            return (
              <li
                key={p.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? "active" : ""}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(h)}
                onMouseEnter={() => setActive(i)}
              >
                <span className="cat-badge" style={{ color: cat.color }} aria-hidden>
                  <cat.Icon size={16} />
                </span>
                <span className="result-text">
                  <strong>{title}</strong>
                  <small>{h.detail ? [p.name, ...rest].join(" · ") : cat.label}</small>
                </span>
              </li>
            );
          })}
          {hits.length === 0 && (
            <li className="empty" role="option" aria-selected={false}>
              No matches for “{q}”. Try another name, or browse the list below.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
