"use client";

import { useEffect, useState, type RefObject } from "react";

const MIN_STUDIO_HEIGHT_PX = 420;
const BOTTOM_GAP_PX = 12;

/** Measure remaining viewport height below the studio shell anchor. */
export function useWebsiteStudioHeight(
  anchorRef: RefObject<HTMLElement | null>,
): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) {
      return;
    }

    const update = () => {
      const top = anchor.getBoundingClientRect().top;
      const next = Math.max(
        MIN_STUDIO_HEIGHT_PX,
        Math.floor(window.innerHeight - top - BOTTOM_GAP_PX),
      );
      setHeight(next);
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(anchor);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [anchorRef]);

  return height;
}
