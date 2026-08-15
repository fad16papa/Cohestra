"use client";

import { useEffect, useState } from "react";

/** Subscribes to a CSS media query; false until mounted (SSR-safe default). */
export function useSyncMedia(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const sync = () => setMatches(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [query]);

  return matches;
}
