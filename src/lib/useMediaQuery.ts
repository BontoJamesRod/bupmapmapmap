import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const mq = matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}

/** Phone / small-tablet layout: bottom tab bar + draggable sheet. Must match the CSS breakpoint. */
export const MOBILE_QUERY = "(max-width: 899px)";
export const useIsMobile = () => useMediaQuery(MOBILE_QUERY);
