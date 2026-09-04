"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  CINEMA_CHAPTER_VH,
  CINEMA_HEADER_OFFSET_PX,
  CINEMA_HYSTERESIS,
  PRODUCT_SLIDE_COUNT,
  PRODUCT_SLIDES,
  type ProductSlideId,
} from "@/lib/marketing/product-slides";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Hysteresis is 3% of one chapter in raw units (progress * n). */
function indexFromProgress(progress: number, current: number) {
  const n = PRODUCT_SLIDE_COUNT;
  const raw = progress * n;
  const lower = current - CINEMA_HYSTERESIS;
  const upper = current + 1 + CINEMA_HYSTERESIS;
  if (raw >= lower && raw < upper) {
    return current;
  }
  return clamp(Math.floor(raw), 0, n - 1);
}

export function useMarketingProductCinema(enabled: boolean, initialIndex = 0) {
  const startIndex = clamp(initialIndex, 0, PRODUCT_SLIDE_COUNT - 1);
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [liveAnnouncement, setLiveAnnouncement] = useState(
    () =>
      `${PRODUCT_SLIDES[startIndex]!.navLabel}. ${PRODUCT_SLIDES[startIndex]!.job}.`
  );
  const [climaxArmed, setClimaxArmed] = useState(false);
  const indexRef = useRef(startIndex);
  const seekingRef = useRef(false);
  const seekTokenRef = useRef(0);
  const announceTimerRef = useRef<number | null>(null);
  const lastAnnouncedRef = useRef(PRODUCT_SLIDES[startIndex]!.id);
  const scrubbingRef = useRef(false);
  const mountedSeekDoneRef = useRef(false);

  const announce = useCallback((index: number, immediate: boolean) => {
    const slide = PRODUCT_SLIDES[index]!;
    if (slide.id === lastAnnouncedRef.current && !immediate) {
      return;
    }

    const run = () => {
      lastAnnouncedRef.current = slide.id;
      setLiveAnnouncement(`${slide.navLabel}. ${slide.job}.`);
    };

    if (announceTimerRef.current !== null) {
      window.clearTimeout(announceTimerRef.current);
      announceTimerRef.current = null;
    }

    if (immediate) {
      run();
      return;
    }

    announceTimerRef.current = window.setTimeout(run, 300);
  }, []);

  const readProgress = useCallback(() => {
    const track = trackRef.current;
    if (!track) {
      return 0;
    }
    const rect = track.getBoundingClientRect();
    const stickyTop = CINEMA_HEADER_OFFSET_PX;
    const scrollable = Math.max(track.offsetHeight - window.innerHeight, 1);
    const scrolled = stickyTop - rect.top;
    return clamp(scrolled / scrollable, 0, 1);
  }, []);

  const updateFromScroll = useCallback(() => {
    if (!enabled || seekingRef.current) {
      return;
    }

    const progress = readProgress();
    const next = indexFromProgress(progress, indexRef.current);

    if (next !== indexRef.current) {
      const prev = indexRef.current;
      indexRef.current = next;
      setActiveIndex(next);

      const enteredWebsiteByScrub =
        PRODUCT_SLIDES[prev]?.id === "reports" &&
        PRODUCT_SLIDES[next]?.id === "website" &&
        scrubbingRef.current;
      setClimaxArmed(Boolean(enteredWebsiteByScrub));
      if (PRODUCT_SLIDES[next]?.id !== "website") {
        setClimaxArmed(false);
      }

      announce(next, false);
    }
  }, [announce, enabled, readProgress]);

  const cancelSmoothSeek = useCallback(() => {
    if (!seekingRef.current) {
      return;
    }
    seekTokenRef.current += 1;
    seekingRef.current = false;
    window.scrollTo({ top: window.scrollY, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let raf = 0;
    const onScroll = () => {
      if (seekingRef.current) {
        return;
      }
      if (raf) {
        return;
      }
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        updateFromScroll();
      });
    };

    const onUserScrollIntent = (event: Event) => {
      const track = trackRef.current;
      if (!track) {
        return;
      }
      const rect = track.getBoundingClientRect();
      const inTrack = rect.top < window.innerHeight && rect.bottom > 0;
      if (!inTrack) {
        return;
      }
      scrubbingRef.current = true;
      if (seekingRef.current) {
        cancelSmoothSeek();
      }
      // touch/wheel are real scrub
      if (event.type === "wheel" || event.type === "touchmove") {
        scrubbingRef.current = true;
      }
    };

    updateFromScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onUserScrollIntent, { passive: true });
    window.addEventListener("touchmove", onUserScrollIntent, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onUserScrollIntent);
      window.removeEventListener("touchmove", onUserScrollIntent);
      window.removeEventListener("resize", onScroll);
      if (raf) {
        window.cancelAnimationFrame(raf);
      }
      if (announceTimerRef.current !== null) {
        window.clearTimeout(announceTimerRef.current);
      }
    };
  }, [cancelSmoothSeek, enabled, updateFromScroll]);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior) => {
      const track = trackRef.current;
      if (!track) {
        return;
      }

      const target = clamp(index, 0, PRODUCT_SLIDE_COUNT - 1);
      const rect = track.getBoundingClientRect();
      const trackTop = window.scrollY + rect.top;
      const scrollable = Math.max(track.offsetHeight - window.innerHeight, 1);
      const progress = (target + 0.5) / PRODUCT_SLIDE_COUNT;
      const nextY = trackTop - CINEMA_HEADER_OFFSET_PX + progress * scrollable;

      indexRef.current = target;
      setActiveIndex(target);
      announce(target, true);
      setClimaxArmed(false);

      const token = ++seekTokenRef.current;
      seekingRef.current = behavior === "smooth";
      scrubbingRef.current = false;

      window.scrollTo({ top: nextY, behavior });

      if (behavior === "auto") {
        seekingRef.current = false;
        return;
      }

      const finish = () => {
        if (token !== seekTokenRef.current) {
          return;
        }
        seekingRef.current = false;
        updateFromScroll();
      };

      const onScrollEnd = () => {
        window.removeEventListener("scrollend", onScrollEnd);
        finish();
      };
      window.addEventListener("scrollend", onScrollEnd, { once: true });
      window.setTimeout(finish, 1200);
    },
    [announce, updateFromScroll]
  );

  const seekToIndex = useCallback(
    (index: number) => {
      const prefersReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      scrollToIndex(index, prefersReduce ? "auto" : "smooth");
    },
    [scrollToIndex]
  );

  const resetToClients = useCallback(() => {
    seekTokenRef.current += 1;
    seekingRef.current = false;
    scrubbingRef.current = false;
    setClimaxArmed(false);
    scrollToIndex(0, "auto");
  }, [scrollToIndex]);

  // Preserve chapter when remounting into cinema (not a hash reset).
  useEffect(() => {
    if (!enabled || mountedSeekDoneRef.current) {
      return;
    }
    mountedSeekDoneRef.current = true;
    if (startIndex === 0) {
      return;
    }
    const id = window.requestAnimationFrame(() => {
      scrollToIndex(startIndex, "auto");
    });
    return () => window.cancelAnimationFrame(id);
  }, [enabled, scrollToIndex, startIndex]);

  const activeId = PRODUCT_SLIDES[activeIndex]!.id as ProductSlideId;
  const trackHeightVh = PRODUCT_SLIDE_COUNT * CINEMA_CHAPTER_VH;

  return {
    trackRef,
    activeIndex,
    activeId,
    liveAnnouncement,
    climaxArmed,
    trackHeightVh,
    seekToIndex,
    resetToClients,
  };
}
