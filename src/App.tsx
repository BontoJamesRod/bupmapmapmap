import { useCallback, useEffect, useMemo, useState } from "react";
import { Info, Maximize2, Monitor, Moon, Search, Sun, WifiOff, X } from "lucide-react";
import type { Campus, Endpoint, Graph, LngLat, Place, RouteResult } from "./types";
import { MapView } from "./map/MapView";
import { SearchBox } from "./components/SearchBox";
import { PlaceCard } from "./components/PlaceCard";
import { Directions } from "./components/Directions";
import { PlaceList } from "./components/PlaceList";
import { QrSign } from "./components/QrSign";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { TabBar } from "./components/TabBar";
import { BottomSheet, type Snap } from "./components/BottomSheet";
import { SearchPage } from "./components/SearchPage";
import { useIsMobile } from "./lib/useMediaQuery";
import { createSearch } from "./lib/search";
import { Router } from "./lib/routing";
import { distanceM } from "./lib/geo";
import { go, href, shareUrl, useView } from "./lib/url";
import { CATEGORY } from "./lib/categories";
import { useTheme, type ThemePref } from "./lib/theme";
import { ON_CAMPUS_RADIUS_M, POPULAR } from "./config";

interface Data { campus: Campus; graph: Graph }

export default function App() {
  return (
    <ErrorBoundary>
      <Loader />
    </ErrorBoundary>
  );
}

function Loader() {
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    const json = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); });
    Promise.all([json("./data/campus.json"), json("./data/graph.json")])
      .then(([campus, graph]) => alive && setData({ campus, graph }))
      .catch(() => alive && setLoadError(true));
    return () => { alive = false; };
  }, [attempt]);

  if (loadError) {
    return (
      <div className="splash" role="alert">
        <Mark size={44} />
        <h1 className="serif">Couldn't load the campus map</h1>
        <p className="muted">Check your connection and try again.</p>
        <button className="btn primary" onClick={() => { setLoadError(false); setAttempt((n) => n + 1); }}>Try again</button>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="splash" aria-busy="true">
        <Mark size={44} />
        <p className="muted">Loading the campus map…</p>
        <span className="spinner" aria-hidden />
      </div>
    );
  }
  return <Navi {...data} />;
}

/** The app's own mark: a map pin in the accent colour. */
function Mark({ size = 28 }: { size?: number }) {
  return <img src="./icon.svg" alt="" width={size} height={size} className="mark" />;
}

function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online;
}

function Navi({ campus, graph }: Data) {
  const view = useView();
  const places = campus.features;
  const byId = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const search = useMemo(() => createSearch(places), [places]);
  const router = useMemo(() => new Router(graph, places), [graph, places]);
  const theme = useTheme();
  const online = useOnline();
  const mobile = useIsMobile();

  // Phone bottom sheet: each screen opens at a sensible height; the user can drag it from there.
  const viewKey = view.name === "place" || view.name === "qr" ? `${view.name}:${view.id}` : view.name === "route" ? `route:${view.to}` : view.name;
  const defaultSnap: Snap = view.name === "home" ? "peek" : view.name === "places" || view.name === "about" ? "full" : "half";
  const [snap, setSnap] = useState<Snap>(defaultSnap);
  useEffect(() => { setSnap(defaultSnap); }, [viewKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Desktop has the search box in the top bar; the phone search screen only exists on phones.
  useEffect(() => { if (!mobile && view.name === "search") go(href.home()); }, [mobile, view.name]);

  const [userPos, setUserPos] = useState<{ coord: LngLat; accuracy: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  const unknownId = view.name === "place" || view.name === "qr" ? view.id : view.name === "route" ? view.to : null;
  useEffect(() => {
    if (unknownId && !byId.has(unknownId)) {
      setToast("Place not found");
      go(href.home());
    }
  }, [unknownId, byId]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Page title follows the screen (useful for history, bookmarks and screen readers).
  const selected: Place | null =
    view.name === "place" ? byId.get(view.id) ?? null :
    view.name === "route" ? byId.get(view.to) ?? null : null;
  useEffect(() => {
    const base = "BUP Navi";
    document.title =
      view.name === "route" && selected ? `Directions to ${selected.properties.name} · ${base}` :
      selected ? `${selected.properties.name} · ${base}` :
      view.name === "about" ? `About · ${base}` : `${base} · BU Polangui campus map`;
  }, [view, selected]);

  // ── route ──
  const routeState = useMemo(() => {
    if (view.name !== "route") return null;
    const to = byId.get(view.to);
    if (!to) return null;
    const from: Endpoint = view.from ?? { kind: "place", id: campus.campus.defaultStart };
    // A place sitting right on the network starts/ends at its door node; otherwise walk from its outline.
    const endPoint = (p: Place) => (p.properties.walkGapM ? p.properties.door ?? p.properties.center : undefined);
    let fromNodes: number[] | undefined, fromPoint: LngLat | undefined, fromLabel: string;
    if (from.kind === "place") {
      const fp = byId.get(from.id);
      if (!fp) return null;
      fromNodes = router.nodesForPlace(fp.id);
      fromPoint = endPoint(fp);
      fromLabel = fp.properties.name;
    } else {
      fromNodes = [router.nearestNode(from.coord).node];
      fromPoint = from.coord;
      fromLabel = from.label;
    }
    const toNodes = router.nodesForPlace(to.id);
    const toPoint = endPoint(to);
    let result: RouteResult | null = null;
    if (fromNodes && toNodes) {
      result = router.route({
        fromNodes, toNodes, fromPoint, toPoint, fromLabel, toLabel: to.properties.name,
        excludeLandmarks: [to.id, ...(from.kind === "place" ? [from.id] : [])],
      });
    }
    const ends = result ? { from: result.path[0], to: result.path[result.path.length - 1] } : null;
    return { from, fromLabel, to, result, ends };
  }, [view, byId, router, campus]);

  // ── actions ──
  const share = useCallback(async (h: string, title: string) => {
    const url = shareUrl(h);
    try {
      if (navigator.share) { await navigator.share({ title, url }); return; }
      await navigator.clipboard.writeText(url);
      setToast("Link copied");
    } catch { /* user cancelled */ }
  }, []);

  const startFromMyLocation = useCallback((to: string) => {
    if (!("geolocation" in navigator)) { setLocError("Location isn't available on this device. Pick a starting point instead."); return; }
    if (!window.isSecureContext) { setLocError("Location needs a secure (https) page. Pick a starting point instead."); return; }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const coord: LngLat = [pos.coords.longitude, pos.coords.latitude];
        setUserPos({ coord, accuracy: pos.coords.accuracy });
        if (distanceM(coord, campus.campus.center) > ON_CAMPUS_RADIUS_M) {
          setLocError("You seem to be outside the campus. Directions start from the Main Gate. Use your maps app to get to the campus first.");
          return;
        }
        go(href.route(to, { kind: "point", coord, label: "Your location" }));
      },
      () => {
        setLocating(false);
        setLocError("Couldn't get your location. No problem: pick a starting point above.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 },
    );
  }, [campus]);

  const startOptions = useMemo(
    () => places.filter((p) => p.properties.identified).sort((a, b) => a.properties.name.localeCompare(b.properties.name)),
    [places],
  );

  // Printable QR sign is a page of its own (no map).
  if (view.name === "qr") {
    const p = byId.get(view.id);
    return p ? <QrSign place={p} /> : null;
  }

  const popular = POPULAR.map((id) => byId.get(id)).filter((p): p is Place => Boolean(p));

  // ── panel content ──
  let panel: React.ReactNode;
  if (view.name === "about") {
    panel = <About campus={campus} theme={theme.pref} onTheme={theme.setPref} />;
  } else if (view.name === "places") {
    const named = places.filter((p) => p.properties.identified).length;
    panel = (
      <div className="card">
        <header className="card-head">
          <div className="card-title">
            <span className="eyebrow">Browse</span>
            <h2 className="serif">All places</h2>
            <p className="muted small">{places.length} places · {named} named</p>
          </div>
          {!mobile && <a className="icon-btn" href={href.home()} aria-label="Close"><X size={18} aria-hidden /></a>}
        </header>
        <PlaceList places={places} openAll />
      </div>
    );
  } else if (routeState && selected) {
    const fromId = routeState.from.kind === "place" ? routeState.from.id : null;
    panel = (
      <Directions
        to={selected}
        fromLabel={routeState.fromLabel}
        fromId={fromId}
        startOptions={startOptions}
        result={routeState.result}
        locating={locating}
        locError={locError}
        onChangeFrom={(id) => go(href.route(selected.id, { kind: "place", id }))}
        onUseLocation={() => startFromMyLocation(selected.id)}
        onSwap={fromId ? () => go(href.route(fromId, { kind: "place", id: selected.id })) : null}
        onShare={() => share(href.route(selected.id, routeState.from), `Directions to ${selected.properties.name}`)}
        onClose={() => go(href.place(selected.id))}
      />
    );
  } else if (selected) {
    const parent = selected.properties.parentId ? byId.get(selected.properties.parentId) ?? null : null;
    panel = (
      <PlaceCard
        place={selected}
        parent={parent}
        onDirections={() => { setLocError(null); go(href.route(selected.id)); }}
        onShare={() => share(href.place(selected.id), selected.properties.name)}
        onClose={() => go(href.home())}
      />
    );
  } else {
    const named = places.filter((p) => p.properties.identified).length;
    panel = (
      <div className="card home">
        <h1 className="serif hello">{greeting()}</h1>
        <p className="muted lede">Where are you headed on campus? Search above, or pick a place.</p>
        <div className="chips" aria-label="Popular places">
          {popular.map((p) => {
            const cat = CATEGORY[p.properties.category];
            return (
              <a key={p.id} className="chip" href={href.place(p.id)}>
                <cat.Icon size={15} style={{ color: cat.color }} aria-hidden />
                {p.properties.shortName ?? p.properties.name}
              </a>
            );
          })}
        </div>
        <div className="home-more">
          <h2 className="section-label">All places <span className="muted">· {named} named</span></h2>
          <PlaceList places={places} />
        </div>
      </div>
    );
  }

  // Re-keying the panel on each screen change (viewKey, above) replays its enter animation.
  const screen = <div key={viewKey} className="view-enter">{panel}</div>;

  const ThemeIcon = theme.pref === "dark" ? Moon : theme.pref === "light" ? Sun : Monitor;
  const themeLabel = theme.pref === "system" ? "Theme: match device" : `Theme: ${theme.pref}`;

  return (
    <div className="app">
      <MapView
        campus={campus}
        selectedId={selected?.id ?? null}
        route={routeState?.result?.path ?? null}
        routeEnds={routeState?.ends ?? null}
        userPos={userPos}
        onSelect={(id) => go(id ? href.place(id) : href.home())}
        resetSignal={resetSignal}
      />

      <header className="topbar">
        <a href={href.home()} className="brand" aria-label="BUP Navi home">
          <Mark size={30} />
          <span className="wordmark serif">BUP Navi</span>
        </a>
        {mobile ? (
          <a className="search-launch" href={href.search()} aria-label="Search buildings, offices and rooms">
            <Search size={18} aria-hidden />
            <span>Search buildings, offices, rooms</span>
          </a>
        ) : (
          <>
            <SearchBox search={search} onPick={(p) => go(href.place(p.id))} />
            <button className="icon-btn floating push" onClick={theme.cycle} aria-label={themeLabel} title={themeLabel}>
              <ThemeIcon size={18} aria-hidden />
            </button>
            <a href={href.about()} className="icon-btn floating" aria-label="About BUP Navi" title="About">
              <Info size={18} aria-hidden />
            </a>
          </>
        )}
      </header>

      {!online && (
        <p className="offline-pill" role="status"><WifiOff size={14} aria-hidden /> Offline: showing the saved map</p>
      )}

      <button className="fab reset" onClick={() => setResetSignal((n) => n + 1)} aria-label="Show whole campus" title="Show whole campus">
        <Maximize2 size={18} aria-hidden />
      </button>

      {mobile ? (
        <>
          {view.name === "search" ? (
            <SearchPage search={search} popular={popular} onPick={(p) => go(href.place(p.id))} onClose={() => go(href.home())} />
          ) : (
            <BottomSheet snap={snap} onSnap={setSnap} label="Details">{screen}</BottomSheet>
          )}
          <TabBar view={view} />
        </>
      ) : (
        <aside className="panel" aria-label="Details">{screen}</aside>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

const THEMES: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "Device", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

function About({ campus, theme, onTheme }: { campus: Campus; theme: ThemePref; onTheme: (t: ThemePref) => void }) {
  return (
    <article className="card" aria-labelledby="about-title">
      <header className="card-head">
        <div className="card-title">
          <span className="eyebrow">About</span>
          <h2 id="about-title" className="serif">BUP Navi</h2>
        </div>
        <a className="icon-btn" href={href.home()} aria-label="Close"><X size={18} aria-hidden /></a>
      </header>
      <p className="lede">
        An open campus map with walking directions for <strong>{campus.campus.name}</strong>. No login and no
        tracking. Your location never leaves your phone.
      </p>
      <p className="note">Student project, not an official Bicol University service.</p>
      <section className="facts">
        <h3 id="appearance-label">Appearance</h3>
        <div
          className="segmented"
          role="radiogroup"
          aria-labelledby="appearance-label"
          style={{ "--seg": THEMES.findIndex((t) => t.value === theme) } as React.CSSProperties}
        >
          {THEMES.map(({ value, label, Icon }) => (
            <button key={value} role="radio" aria-checked={theme === value} className={theme === value ? "on" : ""} onClick={() => onTheme(value)}>
              <Icon size={16} aria-hidden /> {label}
            </button>
          ))}
        </div>
      </section>
      <section className="facts">
        <h3>How to use</h3>
        <ul className="plain prose">
          <li>Search a building, office, room or nickname (try “library” or “xerox”).</li>
          <li>Tap <strong>Directions</strong>, then pick where you're starting from.</li>
          <li>Print a <strong>QR sign</strong> for any building so others can scan for directions.</li>
          <li>Works offline once loaded, and can be added to your home screen.</li>
        </ul>
      </section>
      <section className="facts">
        <h3>Data</h3>
        <p className="small">
          Dataset {campus.campus.datasetVersion}. Map data ©{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>,
          ODbL. Names come from OpenStreetMap, the BU Polangui NSTP orientation directory, and student surveys.
          Grey “?” buildings still need names. Help us fill them in!
        </p>
      </section>
      <section className="facts">
        <h3>Credits</h3>
        <p className="small">Inspired by SCNavi by Blockers United. Code licensed Apache-2.0.</p>
      </section>
    </article>
  );
}
