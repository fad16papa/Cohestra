"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_THRESHOLD_PX = 20;

function collectScrollRoots(start: HTMLElement | null): EventTarget[] {
  const roots: EventTarget[] = [window];
  let node = start?.parentElement ?? null;

  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") {
      roots.push(node);
    }
    node = node.parentElement;
  }

  return roots;
}

/** True once the user scrolls past the hero header zone (window or nested preview panes). */
export function useMarketingHeaderScroll(enabled: boolean, thresholdPx = DEFAULT_THRESHOLD_PX) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setScrolled(false);
      return;
    }

    const roots = collectScrollRoots(anchorRef.current);

    const update = () => {
      let past = window.scrollY > thresholdPx;

      if (!past) {
        for (const root of roots) {
          if (root instanceof Element && root.scrollTop > thresholdPx) {
            past = true;
            break;
          }
        }
      }

      setScrolled(past);
    };

    update();

    for (const root of roots) {
      root.addEventListener("scroll", update, { passive: true });
    }

    return () => {
      for (const root of roots) {
        root.removeEventListener("scroll", update);
      }
    };
  }, [enabled, thresholdPx]);

  return { scrolled, anchorRef };
}
