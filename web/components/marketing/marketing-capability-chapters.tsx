"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { MarketingReveal, marketingRevealDelay } from "@/components/marketing/marketing-reveal";
import { MarketingCapabilityStage } from "@/components/marketing/marketing-capability-stage";
import type { LandingCapabilityChapter } from "@/lib/marketing/landing-content";
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

function ChapterThumbnails({
  chapters,
  shownId,
  scrollToChapter,
}: {
  chapters: LandingCapabilityChapter[];
  shownId: string;
  scrollToChapter: (id: string) => void;
}) {
  return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {chapters.map((chapter, index) => {
          const current = chapter.id === shownId;
          return (
            <button
              key={chapter.id}
              type="button"
              onClick={() => scrollToChapter(chapter.id)}
              className={cn(
                "min-h-11 rounded-xl border px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lagoon focus-visible:ring-offset-2",
                current
                  ? "border-lagoon bg-background text-ink"
                  : "border-border-warm text-muted-foreground hover:text-ink"
              )}
            >
              <span className="block text-[0.65rem] font-medium uppercase tracking-wide text-text-accent">
                {formatChapterProgress(index, chapters.length)}
              </span>
              <span className="font-medium">{chapter.title}</span>
            </button>
          );
        })}
      </div>
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
  const observerRef = useRef<IntersectionObserver | null>(null);

  const shownId = chapters.some((chapter) => chapter.id === activeId)
    ? activeId
    : (chapters[0]?.id ?? "registration");

  const activeIndex = Math.max(
    0,
    chapters.findIndex((chapter) => chapter.id === shownId)
  );

  const activeChapter = chapters[activeIndex] ?? chapters[0];

  const scrollToChapter = useCallback((id: string) => {
    const node = document.getElementById(id);
    if (!node) {
      return;
    }
    setActiveId(id);
    node.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  }, []);

  useEffect(() => {
    const nodes = chapters
      .map((chapter) => document.getElementById(chapter.id))
      .filter((node): node is HTMLElement => node !== null);

    if (nodes.length === 0) {
      return;
    }

    observerRef.current?.disconnect();

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        if (top?.target.id) {
          setActiveId(top.target.id);
        }
      },
      {
        root: null,
        rootMargin: "-12% 0px -70% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    for (const node of nodes) {
      observer.observe(node);
    }
    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [chapters]);

  const goPrevious = () => {
    if (activeIndex <= 0) {
      return;
    }
    scrollToChapter(chapters[activeIndex - 1].id);
  };

  const goNext = () => {
    if (activeIndex >= chapters.length - 1) {
      return;
    }
    scrollToChapter(chapters[activeIndex + 1].id);
  };

  return (
    <section
      id="capabilities"
      className="scroll-mt-24 border-t border-line bg-paper-warm"
      aria-label="Product capabilities"
    >
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="lg:sticky lg:top-16 lg:z-10 lg:bg-paper-warm lg:pb-2">
        <MarketingReveal delayMs={marketingRevealDelay(0)} className="max-w-2xl">
          <p className="text-section text-text-accent">Capabilities</p>
          <h2 className="text-marketing-section mt-3 max-w-[22ch] font-[family-name:var(--font-fraunces)] text-ink">
            One workspace from registration to analytics
          </h2>
          <p className="text-marketing-lead mt-3 max-w-[50ch] text-muted-foreground">
            Registration, clients, follow-up, your site, the form, and the report live in one
            workspace.
          </p>
        </MarketingReveal>

        <div className="mt-8 hidden bg-paper-warm lg:block">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)] lg:items-start lg:gap-12">
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
              <div className="mt-4">
                <ChapterThumbnails
                  chapters={chapters}
                  shownId={shownId}
                  scrollToChapter={scrollToChapter}
                />
              </div>
            </div>
          </div>
        </div>
        </div>

        {chapters.map((chapter, index) => (
          <div
            key={chapter.id}
            id={chapter.id}
            className="h-auto scroll-mt-28 lg:h-[70vh] lg:invisible lg:pointer-events-none"
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
          <ChapterThumbnails
            chapters={chapters}
            shownId={shownId}
            scrollToChapter={scrollToChapter}
          />
          <div className="mt-6">
            <ChapterControls
              activeIndex={activeIndex}
              chapterCount={chapters.length}
              goPrevious={goPrevious}
              goNext={goNext}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
