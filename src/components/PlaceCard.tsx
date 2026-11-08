import { CircleHelp, Layers, Navigation, Printer, Share2, X } from "lucide-react";
import type { Place } from "../types";
import { CATEGORY } from "../lib/categories";
import { floorLabel } from "../lib/search";
import { href } from "../lib/url";
import { REPO_URL } from "../config";

interface Props {
  place: Place;
  parent: Place | null;
  onDirections: () => void;
  onShare: () => void;
  onClose: () => void;
}

export function PlaceCard({ place, parent, onDirections, onShare, onClose }: Props) {
  const p = place.properties;
  const cat = CATEGORY[p.category];
  const reportUrl = REPO_URL
    ? `${REPO_URL}/issues/new?template=place.yml&title=${encodeURIComponent(`Place: ${p.name}`)}&place=${encodeURIComponent(p.id)}`
    : null;

  return (
    <article className="card" aria-labelledby="place-title">
      <header className="card-head">
        <div className="card-title">
          <span className="eyebrow" style={{ color: p.identified ? cat.color : undefined }}>
            {p.identified ? <cat.Icon size={14} aria-hidden /> : <CircleHelp size={14} aria-hidden />}
            {p.identified ? cat.label : "Unidentified"}
          </span>
          <h2 id="place-title" className="serif">{p.name}</h2>
          {parent && (
            <p className="muted small">
              Inside <a href={href.place(parent.id)}>{parent.properties.name}</a>
            </p>
          )}
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} aria-hidden /></button>
      </header>

      {!p.verified && (
        <p className="note">
          {p.identified ? "Not yet verified on site." : "We don't know this building's name yet. Know it? Tell us."}
        </p>
      )}
      {p.description && <p className="lede">{p.description}</p>}

      <div className="actions">
        <button className="btn primary" onClick={onDirections}><Navigation size={16} aria-hidden /> Directions</button>
        <button className="btn" onClick={onShare}><Share2 size={16} aria-hidden /> Share</button>
        <a className="btn" href={href.qr(p.id)}><Printer size={16} aria-hidden /> QR sign</a>
      </div>

      {p.floors && (
        <p className="meta"><Layers size={15} aria-hidden /> {p.floors} floor{p.floors > 1 ? "s" : ""}</p>
      )}
      {p.departments.length > 0 && (
        <section className="facts">
          <h3>Departments</h3>
          <ul className="plain">{p.departments.map((d) => <li key={d}>{d}</li>)}</ul>
        </section>
      )}
      {p.offices.length > 0 && (
        <section className="facts">
          <h3>Offices</h3>
          <ul className="plain">
            {p.offices.map((o) => (
              <li key={o.name}><span>{o.name}</span>{o.floor ? <span className="muted">{floorLabel(o.floor)}</span> : null}</li>
            ))}
          </ul>
        </section>
      )}
      {p.rooms.length > 0 && (
        <section className="facts">
          <h3>Rooms</h3>
          <ul className="plain">
            {p.rooms.map((r) => (
              <li key={r.code}>
                <span><strong>{r.code}</strong>{r.name && r.name !== r.code ? ` ${r.name}` : ""}</span>
                {r.floor ? <span className="muted">{floorLabel(r.floor)}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      )}
      {reportUrl && (
        <p className="muted small footnote">
          Something wrong? <a href={reportUrl} target="_blank" rel="noreferrer">Report it</a>
        </p>
      )}
    </article>
  );
}
