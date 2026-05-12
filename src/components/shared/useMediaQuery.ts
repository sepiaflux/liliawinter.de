import { useEffect, useState } from "react";

// SSR-safe useMediaQuery. Returns false on the server / before hydration.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);

  return matches;
}

export const useIsMobile = () => useMediaQuery("(max-width: 768px)");
export const useIsTouch = () => useMediaQuery("(hover: none) and (pointer: coarse)");
export const usePrefersReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");
