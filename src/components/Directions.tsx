import {
  ArrowUp, ArrowUpDown, ArrowUpLeft, ArrowUpRight, Circle, CornerUpLeft, CornerUpRight, Flag,
  LocateFixed, RotateCw, Share2, Undo2, X, type LucideIcon,
} from "lucide-react";
import type { Place, RouteResult, Step } from "../types";

const ICON: Record<Step["icon"], LucideIcon> = {
  depart: Circle, straight: ArrowUp, left: CornerUpLeft, right: CornerUpRight, "slight-left": ArrowUpLeft,
  "slight-right": ArrowUpRight, "u-turn": Undo2, roundabout: RotateCw, arrive: Flag,
};

interface Props {
  to: Place;
  fromLabel: string;
  startOptions: Place[];
  fromId: string | null;
  result: RouteResult | null;
  locating: boolean;
  locError: string | null;
  onChangeFrom: (id: string) => void;
  onUseLocation: () => void;
  onSwap: (() => void) | null;
  onShare: () => void;
  onClose: () => void;
}

export function Directions(props: Props) {
  const { to, fromLabel, startOptions, fromId, result, locating, locError } = props;
  return (
    <section className="card" aria-labelledby="dir-title">
      <header className="card-head">
        <div className="card-title">
          <span className="eyebrow">Walking directions</span>
          <h2 id="dir-title" className="serif">{to.properties.name}</h2>
        </div>
        <button className="icon-btn" onClick={props.onClose} aria-label="Close directions"><X size={18} aria-hidden /></button>
      </header>

      <div className="from-row">
        <label htmlFor="from-select">From</label>
        <div className="select">
          <select
            id="from-select"
            value={fromId ?? "__loc"}
            onChange={(e) => e.target.value !== "__loc" && props.onChangeFrom(e.target.value)}
          >
            {fromId === null && <option value="__loc">{fromLabel}</option>}
            {startOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.properties.name}</option>
            ))}
          </select>
        </div>
        {props.onSwap && (
          <button className="icon-btn bordered" onClick={props.onSwap} aria-label="Swap start and destination" title="Swap">
            <ArrowUpDown size={16} aria-hidden />
          </button>
        )}
      </div>
      <button className="btn subtle wide" onClick={props.onUseLocation} disabled={locating}>
        <LocateFixed size={16} aria-hidden /> {locating ? "Finding you…" : "Start from my location"}
      </button>
      {locError && <p className="note" role="status">{locError}</p>}

      {result ? (
        <>
          <p className="summary" role="status">
            <span className="serif big">{result.minutes} min</span>
            <span className="muted">walk · {result.distanceM} m</span>
          </p>
          <ol className="steps">
            {result.steps.map((s, i) => {
              const Icon = ICON[s.icon];
              return (
                <li key={i} className={s.icon}>
                  <span className="step-icon" aria-hidden><Icon size={15} /></span>
                  <span className="step-text">{s.text}</span>
                  {s.distanceM > 0 && <span className="muted step-dist">{s.distanceM} m</span>}
                </li>
              );
            })}
          </ol>
          <div className="actions">
            <button className="btn" onClick={props.onShare}><Share2 size={16} aria-hidden /> Share route</button>
          </div>
          <p className="muted small footnote">
            Routes use campus roads plus student-mapped walkways (short dashes) and hallways (long dashes).
            Spot a shortcut we missed? Tell us.
          </p>
        </>
      ) : (
        <p className="note" role="status">
          We couldn't find a mapped path to this place yet. It's on the map: walk toward the highlighted building.
        </p>
      )}
    </section>
  );
}
