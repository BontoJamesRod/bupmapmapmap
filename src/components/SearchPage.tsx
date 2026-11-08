import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, Search, X } from "lucide-react";
import type { Place } from "../types";
import type { SearchHit } from "../lib/search";
import { CATEGORY } from "../lib/categories";
import { href } from "../lib/url";

interface Props {
  search: (q: string) => SearchHit[];
  popular: Place[];
  onPick: (place: Place) => void;
  onClose: () => void;
}

/** Phone search screen: full-height, keyboard up, large result rows (56 px). */
export function SearchPage({ search, popular, onPick, onClose }: Props) {
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const hits = useMemo(() => (q.trim().length >= 2 ? search(q) : []), [q, search]);

  useEffect(() => { input.current?.focus(); }, []);

  return (
    <div className="search-page" role="dialog" aria-modal="true" aria-label="Search">
      <form className="search-page-head" role="search" onSubmit={(e) => { e.preventDefault(); if (hits[0]) onPick(hits[0].place); }}>
        <button type="button" className="icon-btn touch" onClick={onClose} aria-label="Back to map"><ArrowLeft size={22} aria-hidden /></button>
        <div className="search-page-field">
          <Search size={18} className="field-icon" aria-hidden />
          <input
            ref={input}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Building, office, room…"
            aria-label="Search buildings, offices and rooms"
            enterKeyHint="search"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          {q && (
            <button type="button" className="field-clear" onClick={() => { setQ(""); input.current?.focus(); }} aria-label="Clear search">
              <X size={18} aria-hidden />
            </button>
          )}
        </div>
      </form>

      <div className="search-page-body">
        {q.trim().length < 2 ? (
          <>
            <h2 className="section-label">Popular</h2>
            <ul className="rows">
              {popular.map((p) => <Row key={p.id} place={p} onPick={onPick} />)}
            </ul>
            <p className="muted small hint">
              Try a nickname like “library”, “xerox” or “guidance”, or <a href={href.places()}>browse all places</a>.
            </p>
          </>
        ) : hits.length ? (
          <>
            <h2 className="section-label">{hits.length} result{hits.length > 1 ? "s" : ""}</h2>
            <ul className="rows" aria-live="polite">
              {hits.map((h) => <Row key={h.place.properties.id} place={h.place} detail={h.detail ?? undefined} onPick={onPick} />)}
            </ul>
          </>
        ) : (
          <p className="empty-state" role="status">
            No matches for “{q}”.<br />
            <span className="muted">Check the spelling, or <a href={href.places()}>browse all places</a>.</span>
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ place, detail, onPick }: { place: Place; detail?: string; onPick: (p: Place) => void }) {
  const p = place.properties;
  const cat = CATEGORY[p.category];
  const [title, ...rest] = detail ? detail.split(" · ") : [p.name];
  return (
    <li>
      <button className="row" onClick={() => onPick(place)}>
        <span className="cat-badge lg" style={{ color: cat.color }} aria-hidden><cat.Icon size={20} /></span>
        <span className="row-text">
          <strong>{title}</strong>
          <small>{detail ? [p.name, ...rest].join(" · ") : cat.label}</small>
        </span>
        <ChevronRight size={18} className="row-chev" aria-hidden />
      </button>
    </li>
  );
}
