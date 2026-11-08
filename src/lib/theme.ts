import { useCallback, useEffect, useState } from "react";

export type ThemePref = "system" | "light" | "dark";
const KEY = "bupc-navi:theme";
const ORDER: ThemePref[] = ["system", "light", "dark"];

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system"; // storage blocked (private mode, etc.)
  }
}

/** Applies the preference to <html data-theme> and keeps the browser chrome colour in sync. */
export function applyTheme(pref: ThemePref) {
  const root = document.documentElement;
  if (pref === "system") delete root.dataset.theme;
  else root.dataset.theme = pref;
  const dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#262624" : "#F5F4EE");
}

/** Per-viewer convenience only; the app works the same if storage is unavailable. */
export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(read);
  useEffect(() => {
    applyTheme(pref);
    try { if (pref === "system") localStorage.removeItem(KEY); else localStorage.setItem(KEY, pref); } catch { /* ignore */ }
    if (pref !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const on = () => applyTheme("system");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [pref]);
  const cycle = useCallback(() => setPref((p) => ORDER[(ORDER.indexOf(p) + 1) % ORDER.length]), []);
  return { pref, cycle, setPref };
}
