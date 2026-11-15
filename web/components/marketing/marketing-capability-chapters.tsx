"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { MarketingReveal, marketingRevealDelay } from "@/components/marketing/marketing-reveal";
import { MarketingCapabilityStage } from "@/components/marketing/marketing-capability-stage";
import type { LandingCapabilityChapter } from "@/lib/marketing/landing-content";
import {
  chooseChapterId,
  computeDesktopFrame,
  stepChapter,
  type DesktopFrame,
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

/**
 * Desktop stories are shorter than the product frame. The frame stays fully
 * visible only while a story still sits low enough to hold it, so the reading
 * line lives inside the frame instead of under the header. Mobile stories
 * include their own frame, so they use a line just below the header.
 */
const MOBILE_READING_LINE = 136;
const MOBILE_STORY_TOP = 112;
const FALLBACK_FRAME: DesktopFrame = computeDesktopFrame(576, 279, 900);

function desktopLayout(): boolean {
  return window.matchMedia("(min-width: 1024px)").matches;
}

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

function ChapterCopy({
  chapter,
  index,
}: {
  chapter: LandingCapabilityChapter;
  index: number;
}) {
  const benefits = chapter.benefits.slice(0, 2);
  return (
    <>
      <p className="text-sm font-medium tabular-nums text-text-accent">
        {String(index + 1).padStart(2, "0")}
        <span className="sr-only"> {chapter.title}</span>
      </p>
      <p className="mt-2 text-section text-text-accent">{chapter.plan}</p>
      <h3 className="mt-2 font-[family-name:var(--font-fraunces)] text-[1.5rem] font-medium tracking-[-0.025em] text-ink">
        {chapter.title}
      </h3>
      <p className="mt-3 max-w-[42ch] text-[0.95rem] leading-relaxed text-muted-foreground">
        {chapter.description}
      </p>
      {benefits.length > 0 ? (
        <ul className="mt-4 max-w-[42ch] space-y-2 text-sm text-ink">
          {benefits.map((benefit) => (
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
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {chapters.map((chapter) => {
          const current = chapter.id === shownId;
          return (
            <li key={chapter.id} className="shrink-0">
              <button
                type="button"
                onClick={() => scrollToChapter(chapter.id)}
                aria-current={current ? "true" : undefined}
                className={cn(
                  "min-h-11 rounded-full border px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lagoon focus-visible:ring-offset-2",
                  current
                    ? "border-lagoon bg-background text-ink"
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
  const intendedIdRef = useRef(chapters[0]?.id ?? "registration");
  const programmaticScroll = useRef(false);
  const scrollGeneration = useRef(0);
  const measureRaf = useRef<number | null>(null);
  const frameRef = useRef<DesktopFrame>(FALLBACK_FRAME);
  const stageRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<DesktopFrame>(FALLBACK_FRAME);

  const shownId = chapters.some((chapter) => chapter.id === activeId)
    ? activeId
    : (chapters[0]?.id ?? "registration");

  const activeIndex = Math.max(
    0,
    chapters.findIndex((chapter) => chapter.id === shownId)
  );

  const measureChapters = useCallback(() => {
    if (programmaticScroll.current) {
      return;
    }
    const stories = chapters
      .map((chapter) => {
        const node = document.getElementById(chapter.id);
        if (!node) {
          return null;
        }
        const rect = node.getBoundingClientRect();
        return { id: chapter.id, top: rect.top, bottom: rect.bottom };
      })
      .filter((entry): entry is { id: string; top: number; bottom: number } => entry !== null);

    const next = chooseChapterId(
      stories,
      window.innerHeight,
      desktopLayout() ? frameRef.current.readingLine : MOBILE_READING_LINE
    );
    if (next) {
      intendedIdRef.current = next;
      setActiveId(next);
    }
  }, [chapters]);

  const scheduleMeasure = useCallback(() => {
    if (measureRaf.current !== null) {
      return;
    }
    measureRaf.current = window.requestAnimationFrame(() => {
      measureRaf.current = null;
      measureChapters();
    });
  }, [measureChapters]);

  const scrollToChapter = useCallback(
    (id: string) => {
      const node = document.getElementById(id);
      if (!node) {
        return;
      }
      const generation = ++scrollGeneration.current;
      programmaticScroll.current = true;
      intendedIdRef.current = id;
      setActiveId(id);
      const finish = () => {
        if (scrollGeneration.current !== generation) {
          return;
        }
        programmaticScroll.current = false;
        scheduleMeasure();
      };
      window.addEventListener("scrollend", finish, { once: true });
      const offset = desktopLayout() ? frameRef.current.storyTop : MOBILE_STORY_TOP;
      const top = node.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({
        top,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    },
    [scheduleMeasure]
  );

  useEffect(() => {
    const onScroll = () => {
      scheduleMeasure();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    const fitFrame = () => {
      const stage = stageRef.current;
      const lastStory = document.getElementById(chapters[chapters.length - 1]?.id ?? "");
      if (!stage || !lastStory || !desktopLayout()) {
        return;
      }
      const natural = stage.offsetHeight || 576;
      const next = computeDesktopFrame(
        natural,
        lastStory.getBoundingClientRect().height,
        window.innerHeight
      );
      frameRef.current = next;
      setFrame((current) =>
        current.height === next.height &&
        current.storyTop === next.storyTop &&
        current.readingLine === next.readingLine
          ? current
          : next
      );
    };
    fitFrame();
    scheduleMeasure();
    window.addEventListener("resize", fitFrame);

    return () => {
      window.removeEventListener("resize", fitFrame);
      window.removeEventListener("scroll", onScroll);
      if (measureRaf.current !== null) {
        window.cancelAnimationFrame(measureRaf.current);
        measureRaf.current = null;
      }
    };
  }, [scheduleMeasure]);

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

  return (
    <section
      id="capabilities"
      className="scroll-mt-24 border-t border-line bg-paper-warm"
      aria-label="Product capabilities"
    >
      <div className="mx-auto max-w-[90rem] px-5 py-16 sm:px-8 lg:px-10 lg:py-16">
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

        <div className="mt-8">
          <ChapterNav chapters={chapters} shownId={shownId} scrollToChapter={scrollToChapter} />
          <div className="mt-4">
            <ChapterControls
              activeIndex={activeIndex}
              chapterCount={chapters.length}
              goPrevious={() => stepTo(-1)}
              goNext={() => stepTo(1)}
            />
          </div>
        </div>

        <div className="mt-8 lg:grid lg:grid-cols-[minmax(16rem,0.82fr)_minmax(0,1.18fr)] lg:gap-10 xl:gap-14">
          <div className="min-w-0">
            {chapters.map((chapter, index) => {
              const current = chapter.id === shownId;
              return (
                <article
                  key={chapter.id}
                  id={chapter.id}
                  aria-current={current ? "true" : undefined}
                  className="relative scroll-mt-28 border-t border-line py-8 pl-5 motion-reduce:transition-none"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-y-8 left-0 w-0.5",
                      current ? "bg-lagoon" : "bg-transparent"
                    )}
                  />
                  <ChapterCopy chapter={chapter} index={index} />
                  <div className="mt-6 lg:hidden">
                    <MarketingCapabilityStage activeId={chapter.id} chapterIds={[chapter.id]} />
                  </div>
                </article>
              );
            })}
          </div>
          <div className="hidden min-w-0 lg:block">
            <div
              className="lg:sticky lg:top-24"
              style={{ height: frame.height, overflow: "hidden" }}
            >
              <div
                ref={stageRef}
                style={{
                  transform: frame.scale < 0.995 ? `scale(${frame.scale})` : undefined,
                  transformOrigin: "top left",
                  width: frame.scale < 0.995 ? `${100 / frame.scale}%` : undefined,
                }}
              >
                <MarketingCapabilityStage activeId={shownId} chapterIds={chapterIds} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
