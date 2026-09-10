"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  computeCinemaReelState,
  computeRoomBeat,
  type CinemaReelState,
} from "@/lib/marketing/cinema-reel";
import {
  beatCountForSlide,
  clamp,
  indexFromProgress,
  seekProgressForIndex,
} from "@/lib/marketing/cinema-roll";
import {
  CINEMA_CHAPTER_VH,
  CINEMA_HEADER_OFFSET_PX,
  CINEMA_HYSTERESIS,
  PRODUCT_SLIDE_COUNT,
  PRODUCT_SLIDES,
  type ProductSlideId,
} from "@/lib/marketing/product-slides";

export function useMarketingProductCinema(enabled: boolean, initialIndex = 0) {
  const startIndex = clamp(initialIndex, 0, PRODUCT_SLIDE_COUNT - 1);
  const trackRef = useRef<HTMLDivElement>(null);
  const [reel, setReel] = useState<CinemaReelState>(() =>
    computeCinemaReelState(seekProgressForIndex(startIndex, PRODUCT_SLIDE_COUNT))
  );
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [beat, setBeat] = useState(0);
  const [scrollDirection, setScrollDirection] = useState<"up" | "down" | "none">("none");
  const [liveAnnouncement, setLiveAnnouncement] = useState(
    () =>
      `${PRODUCT_SLIDES[startIndex]!.navLabel}. ${PRODUCT_SLIDES[startIndex]!.job}.`
  );
  const indexRef = useRef(startIndex);
  const seekingRef = useRef(false);
  const seekTokenRef = useRef(0);
  const announceTimerRef = useRef<number | null>(null);
  const lastAnnouncedRef = useRef(PRODUCT_SLIDES[startIndex]!.id);
  const mountedSeekDoneRef = useRef(false);
  const lastProgressRef = useRef(0);
  const beatRef = useRef(0);

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

  const syncReelState = useCallback((progress: number, semanticIndex: number) => {
    if (progress > lastProgressRef.current + 0.0001) {
      setScrollDirection("down");
    } else if (progress < lastProgressRef.current - 0.0001) {
      setScrollDirection("up");
    }
    lastProgressRef.current = progress;

    const nextReel = computeCinemaReelState(progress);
    setReel(nextReel);

    const slideId = PRODUCT_SLIDES[semanticIndex]!.id as ProductSlideId;
    const nextBeat = computeRoomBeat(slideId, nextReel.storyProgress);
    if (nextBeat !== beatRef.current) {
      beatRef.current = nextBeat;
      setBeat(nextBeat);
    }
  }, []);

  const updateFromScroll = useCallback(() => {
    if (!enabled || seekingRef.current) {
      return;
    }

    const progress = readProgress();
    const next = indexFromProgress(
      progress,
      PRODUCT_SLIDE_COUNT,
      indexRef.current,
      CINEMA_HYSTERESIS
    );

    if (next !== indexRef.current) {
      indexRef.current = next;
      setActiveIndex(next);
      announce(next, false);
    }

    syncReelState(progress, indexRef.current);
  }, [announce, enabled, readProgress, syncReelState]);

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
      if (seekingRef.current) {
        cancelSmoothSeek();
      }
      if (event.type === "wheel" || event.type === "touchmove") {
        /* scrub intent */
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
      const progress = seekProgressForIndex(target, PRODUCT_SLIDE_COUNT);
      const nextY = trackTop - CINEMA_HEADER_OFFSET_PX + progress * scrollable;

      indexRef.current = target;
      setActiveIndex(target);
      announce(target, true);
      syncReelState(progress, target);

      const token = ++seekTokenRef.current;
      seekingRef.current = behavior === "smooth";
      window.scrollTo({ top: nextY, behavior });

      if (behavior === "auto") {
        seekingRef.current = false;
        return;
      }

      let finished = false;
      const finish = () => {
        if (finished || token !== seekTokenRef.current) {
          return;
        }
        finished = true;
        window.removeEventListener("scrollend", onScrollEnd);
        seekingRef.current = false;
        updateFromScroll();
      };

      const onScrollEnd = () => {
        finish();
      };
      window.addEventListener("scrollend", onScrollEnd, { once: true });

      const pollUntilArrived = () => {
        if (finished || token !== seekTokenRef.current) {
          return;
        }
        if (Math.abs(window.scrollY - nextY) <= 2) {
          finish();
          return;
        }
        window.requestAnimationFrame(pollUntilArrived);
      };
      window.requestAnimationFrame(pollUntilArrived);
      window.setTimeout(finish, 4000);
    },
    [announce, syncReelState, updateFromScroll]
  );

  const seekToIndex = useCallback(
    (index: number) => {
      const prefersReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      scrollToIndex(index, prefersReduce ? "auto" : "smooth");
    },
    [scrollToIndex]
  );

  const resetToStart = useCallback(() => {
    seekTokenRef.current += 1;
    seekingRef.current = false;
    scrollToIndex(0, "auto");
  }, [scrollToIndex]);

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
  const beatCount = beatCountForSlide(activeId);
  const trackHeightVh = PRODUCT_SLIDE_COUNT * CINEMA_CHAPTER_VH;

  return {
    trackRef,
    reel,
    activeIndex,
    activeId,
    chapterProgress: reel.storyProgress,
    beat,
    beatCount,
    scrollDirection,
    liveAnnouncement,
    trackHeightVh,
    seekToIndex,
    resetToStart,
  };
}
