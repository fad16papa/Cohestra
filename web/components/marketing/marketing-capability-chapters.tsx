"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { MarketingReveal, marketingRevealDelay } from "@/components/marketing/marketing-reveal";
import { MarketingCapabilityStage } from "@/components/marketing/marketing-capability-stage";
import type { LandingCapabilityChapter } from "@/lib/marketing/landing-content";
import {
  activeWhileLocked,
  chooseChapterId,
  stepChapter,
} from "@/lib/marketing/capability-scroll";
import { cn } from "@/lib/utils";

/** Preserved for landing source tests; scenes render these in {@link MarketingCapabilityStage}. */
const CAPABILITY_STAGE_LABELS = [
  "Published",
  "History across activities",
  "No outreach yet",
  "Website Studio",
  "Form Studio",
  "Registration report",
  "Sample state, not a customer result.",
] as const;
void CAPABILITY_STAGE_LABELS;

function formatChapterProgress(index: number, total: number): string {
  const current = String(index + 1).padStart(2, "0");
  const last = String(total).padStart(2, "0");
  return `${current} / ${last}`;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function ChapterCopy({ chapter }: { chapter: LandingCapabilityChapter }) {
  return (
    <>
      <p className="text-section text-text-accent">{chapter.plan}</p>
      <h3 className="mt-2 font-[family-name:var(--font-fraunces)] text-[1.5rem] font-medium tracking-[-0.025em] text-ink">
        {chapter.title}
      </h3>
      <p className="mt-3 max-w-[46ch] text-[0.95rem] leading-relaxed text-muted-foreground">
        {chapter.description}
      </p>
      {chapter.benefits.length > 0 ? (
        <ul className="mt-4 max-w-[46ch] space-y-2 text-sm text-ink">
          {chapter.benefits.map((benefit) => (
            <li key={benefit} className="flex gap-2">
              <span className="text-text-accent" aria-hidden>
                ·
              </span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function ChapterNav({
  chapters,
  shownId,
  scrollToChapter,
}: {
  chapters: LandingCapabilityChapter[];
  shownId: string;
  scrollToChapter: (id: string) => void;
}) {
  return (
    <nav aria-label="Capability chapters">
      <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:border-l lg:border-line lg:pb-0">
        {chapters.map((chapter) => {
          const current = chapter.id === shownId;
          return (
            <li key={chapter.id} className="shrink-0 lg:shrink">
              <button
                type="button"
                onClick={() => scrollToChapter(chapter.id)}
                aria-current={current ? "true" : undefined}
                className={cn(
                  "block w-full rounded-xl px-3 py-2 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lagoon focus-visible:ring-offset-2",
                  "min-h-11 lg:min-h-0 lg:rounded-none lg:border-l-2 lg:px-4",
                  current
                    ? "border-lagoon bg-background text-ink lg:bg-transparent"
                    : "border-transparent text-muted-foreground hover:text-ink"
                )}
              >
                {chapter.title}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function ChapterControls({
  activeIndex,
  chapterCount,
  goPrevious,
  goNext,
}: {
  activeIndex: number;
  chapterCount: number;
  goPrevious: () => void;
  goNext: () => void;
}) {
  return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={goPrevious}
            disabled={activeIndex <= 0}
            className={cn(
              "min-h-11 rounded-xl border border-border-warm px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lagoon focus-visible:ring-offset-2",
              activeIndex <= 0
                ? "cursor-not-allowed text-muted-foreground opacity-60"
                : "text-ink hover:bg-background"
            )}
          >
            Previous
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={activeIndex >= chapterCount - 1}
            className={cn(
              "min-h-11 rounded-xl border border-border-warm px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lagoon focus-visible:ring-offset-2",
              activeIndex >= chapterCount - 1
                ? "cursor-not-allowed text-muted-foreground opacity-60"
                : "text-ink hover:bg-background"
            )}
          >
            Next
          </button>
        </div>
        <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
          {formatChapterProgress(activeIndex, chapterCount)}
        </p>
      </div>
  );
}

export function MarketingCapabilityChapters({
  chapters,
}: {
  chapters: LandingCapabilityChapter[];
}) {
  const [activeId, setActiveId] = useState(chapters[0]?.id ?? "registration");
  const chapterIds = chapters.map((chapter) => chapter.id);
  const scrollLock = useRef<string | null>(null);
  const intendedIdRef = useRef(chapters[0]?.id ?? "registration");
  const scrollLockTimer = useRef<number | null>(null);
  const measureRaf = useRef<number | null>(null);
  const releaseScrollLockRef = useRef<() => void>(() => {});
  const releasingScrollLock = useRef(false);

  const shownId = chapters.some((chapter) => chapter.id === activeId)
    ? activeId
    : (chapters[0]?.id ?? "registration");

  const activeIndex = Math.max(
    0,
    chapters.findIndex((chapter) => chapter.id === shownId)
  );

  const activeChapter = chapters[activeIndex] ?? chapters[0];

  const clearScrollLock = useCallback(() => {
    scrollLock.current = null;
    if (scrollLockTimer.current !== null) {
      window.clearTimeout(scrollLockTimer.current);
      scrollLockTimer.current = null;
    }
  }, []);

  const armScrollLock = useCallback(
    (id: string) => {
      scrollLock.current = id;
      if (scrollLockTimer.current !== null) {
        window.clearTimeout(scrollLockTimer.current);
      }
      scrollLockTimer.current = window.setTimeout(() => {
        if (scrollLock.current === id) {
          releaseScrollLockRef.current();
        }
      }, 1200);
    },
    [clearScrollLock]
  );

  const scrollToChapter = useCallback(
    (id: string) => {
      const node = document.getElementById(id);
      if (!node) {
        return;
      }
      armScrollLock(id);
      intendedIdRef.current = id;
      setActiveId(id);
      node.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
    },
    [armScrollLock]
  );

  const measureChapters = useCallback(() => {
    const viewportHeight = window.innerHeight;
    const sentinels = chapters
      .map((chapter) => {
        const node = document.getElementById(chapter.id);
        if (!node) {
          return null;
        }
        const rect = node.getBoundingClientRect();
        return {
          id: chapter.id,
          top: rect.top,
          bottom: rect.bottom,
        };
      })
      .filter((entry): entry is { id: string; top: number; bottom: number } => entry !== null);

    const measured = chooseChapterId(sentinels, viewportHeight);
    const next = activeWhileLocked(scrollLock.current, measured);
    if (next) {
      if (!scrollLock.current) {
        intendedIdRef.current = next;
      }
      setActiveId(next);
    }
  }, [chapters]);

  releaseScrollLockRef.current = () => {
    if (releasingScrollLock.current) {
      return;
    }
    const locked = scrollLock.current;
    if (!locked) {
      return;
    }
    releasingScrollLock.current = true;
    const viewportHeight = window.innerHeight;
    const sentinels = chapters
      .map((chapter) => {
        const node = document.getElementById(chapter.id);
        if (!node) {
          return null;
        }
        const rect = node.getBoundingClientRect();
        return { id: chapter.id, top: rect.top, bottom: rect.bottom };
      })
      .filter((entry): entry is { id: string; top: number; bottom: number } => entry !== null);
    const measured = chooseChapterId(sentinels, viewportHeight);
    if (measured !== locked) {
      document.getElementById(locked)?.scrollIntoView({ behavior: "auto", block: "start" });
      setActiveId(locked);
    }
    clearScrollLock();
    releasingScrollLock.current = false;
  };

  const scheduleMeasure = useCallback(() => {
    if (measureRaf.current !== null) {
      return;
    }
    measureRaf.current = window.requestAnimationFrame(() => {
      measureRaf.current = null;
      measureChapters();
    });
  }, [measureChapters]);

  useEffect(() => {
    const onScroll = () => {
      scheduleMeasure();
    };
    const onScrollEnd = () => {
      releaseScrollLockRef.current();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scrollend", onScrollEnd);
    scheduleMeasure();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scrollend", onScrollEnd);
      if (measureRaf.current !== null) {
        window.cancelAnimationFrame(measureRaf.current);
        measureRaf.current = null;
      }
      if (scrollLockTimer.current !== null) {
        window.clearTimeout(scrollLockTimer.current);
        scrollLockTimer.current = null;
      }
    };
  }, [scheduleMeasure, clearScrollLock]);

  const stepTo = (delta: number) => {
    const index = Math.max(
      0,
      chapters.findIndex((chapter) => chapter.id === intendedIdRef.current)
    );
    const nextIndex = stepChapter(index, delta, chapters.length);
    if (nextIndex === index) {
      return;
    }
    scrollToChapter(chapters[nextIndex].id);
  };

  const goPrevious = () => {
    stepTo(-1);
  };

  const goNext = () => {
    stepTo(1);
  };

  return (
    <section
      id="capabilities"
      className="scroll-mt-24 border-t border-line bg-paper-warm"
      aria-label="Product capabilities"
    >
      <div className="mx-auto max-w-[90rem] px-5 py-16 sm:px-8 lg:px-10 lg:py-12">
        <div className="lg:sticky lg:top-16 lg:z-10 lg:bg-paper-warm lg:pb-2 lg:[overflow-anchor:none]">
        <MarketingReveal delayMs={marketingRevealDelay(0)} className="max-w-2xl">
          <p className="text-section text-text-accent">Capabilities</p>
          <h2 className="mt-3 max-w-[36rem] font-[family-name:var(--font-fraunces)] text-[1.65rem] font-medium tracking-[-0.025em] text-ink lg:text-[1.85rem]">
            One workspace from registration to analytics
          </h2>
          <p className="mt-3 max-w-[50ch] text-[0.95rem] leading-relaxed text-muted-foreground">
            Registration, clients, follow-up, your site, the form, and the report live in one
            workspace.
          </p>
        </MarketingReveal>

        <div className="mt-8 hidden bg-paper-warm lg:block">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] lg:items-start lg:gap-10">
            <div className="min-w-0">
              <ChapterNav chapters={chapters} shownId={shownId} scrollToChapter={scrollToChapter} />
              {activeChapter ? (
                <div className="mt-6 min-w-0" aria-live="polite">
                  <ChapterCopy chapter={activeChapter} />
                </div>
              ) : null}
              <div className="mt-6">
                <ChapterControls
                  activeIndex={activeIndex}
                  chapterCount={chapters.length}
                  goPrevious={goPrevious}
                  goNext={goNext}
                />
              </div>
            </div>
            <div className="min-w-0 motion-reduce:transition-none">
              <MarketingCapabilityStage activeId={shownId} chapterIds={chapterIds} />
            </div>
          </div>
        </div>
        </div>

        {chapters.map((chapter, index) => (
          <div
            key={chapter.id}
            id={chapter.id}
            className="h-auto scroll-mt-28 lg:h-[min(28vh,max(14rem,22vh-5.5rem))] lg:invisible lg:pointer-events-none"
          >
            <MarketingReveal
              delayMs={marketingRevealDelay(index + 1)}
              className="border-t border-line pt-10 lg:hidden"
            >
              <ChapterCopy chapter={chapter} />
              <div className="mt-6">
                <MarketingCapabilityStage activeId={chapter.id} chapterIds={[chapter.id]} />
              </div>
            </MarketingReveal>
          </div>
        ))}

        <div className="mt-10 border-t border-line pt-8 lg:hidden">
          <ChapterNav chapters={chapters} shownId={shownId} scrollToChapter={scrollToChapter} />
          <div className="mt-6">
            <ChapterControls
              activeIndex={activeIndex}
              chapterCount={chapters.length}
              goPrevious={goPrevious}
              goNext={goNext}
            />
          </div>
        </div>
        {/* Tail shrinks on tall screens so Built for sits under the stage without clipping Analytics. */}
        <div
          aria-hidden
          className="hidden lg:block lg:h-[max(0px,calc(18.375rem-(100vh-50rem)*0.22))]"
        />
      </div>
    </section>
  );
}
