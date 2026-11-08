import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export type Snap = "peek" | "half" | "full";
const ORDER: Snap[] = ["peek", "half", "full"];
export const PEEK_PX = 148;

interface Props {
  snap: Snap;
  onSnap: (s: Snap) => void;
  label: string;
  children: ReactNode;
}

/** Measures the space the sheet can use: between the top bar and the tab bar. */
function useSpace() {
  const [space, setSpace] = useState({ vh: window.innerHeight, top: 72, tab: 56 });
  useLayoutEffect(() => {
    const measure = () => {
      const top = (document.querySelector(".topbar") as HTMLElement | null)?.getBoundingClientRect().bottom ?? 64;
      const tab = (document.querySelector(".tabbar") as HTMLElement | null)?.offsetHeight ?? 56;
      setSpace({ vh: window.innerHeight, top: Math.round(top) + 8, tab });
    };
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => { window.removeEventListener("resize", measure); window.visualViewport?.removeEventListener("resize", measure); };
  }, []);
  return space;
}

/**
 * Phone bottom sheet with three snap points (peek / half / full), like mainstream map apps.
 * Drag the handle or swipe the content; content only scrolls once the sheet is fully open,
 * and pulling down at the top of the content collapses it again.
 */
export function BottomSheet({ snap, onSnap, label, children }: Props) {
  const sheet = useRef<HTMLElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const { vh, top, tab } = useSpace();
  const avail = vh - tab;
  const heights: Record<Snap, number> = { peek: PEEK_PX, half: Math.round(avail * 0.5), full: avail - top };
  const [drag, setDrag] = useState<number | null>(null);
  const height = drag ?? heights[snap];

  // Expose the visible sheet height so the map can keep content out from under it.
  useEffect(() => {
    document.documentElement.style.setProperty("--sheet-h", `${heights[snap]}px`);
    document.documentElement.dataset.sheet = snap;
  }, [snap, heights[snap]]); // eslint-disable-line react-hooks/exhaustive-deps

  // Touch gesture (non-passive so we can stop the page from scrolling while we own the drag).
  const g = useRef<{ y: number; h: number; t: number; owned: boolean; handle: boolean; lastY: number; lastT: number } | null>(null);
  const live = useRef({ snap, heights, onSnap });
  live.current = { snap, heights, onSnap };

  useEffect(() => {
    const el = sheet.current;
    if (!el) return;
    const start = (y: number, fromHandle: boolean) => {
      const { snap: s, heights: hs } = live.current;
      g.current = { y, h: hs[s], t: performance.now(), owned: fromHandle, handle: fromHandle, lastY: y, lastT: performance.now() };
    };
    const move = (y: number, e: Event) => {
      const st = g.current;
      if (!st) return;
      const dy = st.y - y; // + = finger moved up
      if (!st.owned) {
        if (Math.abs(dy) < 6) return;
        const atTop = (body.current?.scrollTop ?? 0) <= 0;
        st.owned = live.current.snap !== "full" || (dy < 0 && atTop);
        if (!st.owned) { g.current = null; return; } // let the content scroll natively
      }
      if (e.cancelable) e.preventDefault();
      const hs = live.current.heights;
      setDrag(Math.max(PEEK_PX - 48, Math.min(hs.full, st.h + dy)));
      st.lastY = y; st.lastT = performance.now();
    };
    const end = (y: number) => {
      const st = g.current;
      g.current = null;
      if (!st?.owned) { setDrag(null); return; }
      if (st.handle && Math.abs(st.y - y) < 6) { // a tap on the handle steps the sheet up (or back from full)
        const s = live.current.snap;
        setDrag(null);
        live.current.onSnap(s === "full" ? "half" : ORDER[ORDER.indexOf(s) + 1]);
        return;
      }
      const hs = live.current.heights;
      const h = Math.max(PEEK_PX, Math.min(hs.full, st.h + (st.y - y)));
      const v = (st.lastY - y) / Math.max(1, performance.now() - st.lastT); // px/ms, + = up (recent)
      const flick = (st.y - y) / Math.max(1, performance.now() - st.t);
      let next: Snap;
      if (Math.abs(flick) > 0.6 || Math.abs(v) > 0.6) {
        const i = ORDER.indexOf(live.current.snap) + (flick > 0 ? 1 : -1);
        next = ORDER[Math.max(0, Math.min(2, i))];
      } else {
        next = ORDER.reduce((a, b) => (Math.abs(hs[b] - h) < Math.abs(hs[a] - h) ? b : a));
      }
      setDrag(null);
      live.current.onSnap(next);
    };
    const onTouchStart = (e: TouchEvent) => start(e.touches[0].clientY, !!(e.target as HTMLElement).closest(".sheet-grab"));
    const onTouchMove = (e: TouchEvent) => move(e.touches[0].clientY, e);
    const onTouchEnd = (e: TouchEvent) => end(e.changedTouches[0].clientY);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  // Mouse users (and desktop emulators) can drag the handle too.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    const y0 = e.clientY, h0 = heights[snap];
    let moved = false;
    const mv = (ev: PointerEvent) => { moved = moved || Math.abs(ev.clientY - y0) > 4; if (moved) setDrag(Math.max(PEEK_PX - 48, Math.min(heights.full, h0 + y0 - ev.clientY))); };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      setDrag(null);
      if (!moved) { onSnap(snap === "full" ? "half" : ORDER[ORDER.indexOf(snap) + 1]); return; }
      const h = h0 + y0 - ev.clientY;
      onSnap(ORDER.reduce((a, b) => (Math.abs(heights[b] - h) < Math.abs(heights[a] - h) ? b : a)));
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };

  return (
    <section
      ref={sheet}
      className={`sheet snap-${snap}${drag !== null ? " dragging" : ""}`}
      style={{ height }}
      aria-label={label}
    >
      <div className="sheet-grab" onPointerDown={onPointerDown}>
        <button
          className="sheet-handle"
          aria-label={snap === "full" ? "Collapse panel" : "Expand panel"}
          onClick={(e) => { if (e.detail === 0) onSnap(snap === "full" ? "half" : ORDER[ORDER.indexOf(snap) + 1]); }}
        />
      </div>
      <div ref={body} className="sheet-body">{children}</div>
    </section>
  );
}
