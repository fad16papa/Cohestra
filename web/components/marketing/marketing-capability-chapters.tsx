"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { PersonAvatar } from "@/components/shared/person-avatar";
import { MarketingReveal, marketingRevealDelay } from "@/components/marketing/marketing-reveal";
import { FOLLOW_UP_CATEGORY_OPTIONS } from "@/lib/follow-up-category";
import type { LandingCapabilityChapter } from "@/lib/marketing/landing-content";
import { cn } from "@/lib/utils";

const FRAME_CAPTION = "Sample state, not a customer result.";

function ChapterFrame({ id }: { id: string }) {
  return (
    <figure className="overflow-hidden rounded-[16px] border border-border-warm bg-card">
      <div className="border-b border-border-warm px-4 py-3">
        <p className="text-label text-text-accent">Product preview</p>
      </div>
      <div className="px-4 py-4">
        {id === "registration" ? (
          <div>
            <p className="text-label text-text-accent">Activity</p>
            <p className="mt-1 text-sm font-semibold text-text-warm">Published</p>
            <p className="mt-0.5 text-xs text-text-muted-warm">Public page</p>
            <p className="mt-3 text-xs text-text-muted-warm">QR code included</p>
          </div>
        ) : null}
        {id === "clients" ? (
          <div className="flex items-center gap-3">
            <PersonAvatar name="Returning client" size="sm" />
            <div className="min-w-0">
              <p className="truncate font-medium text-text-warm">Returning client</p>
              <p className="truncate text-sm text-text-muted-warm">History across activities</p>
            </div>
          </div>
        ) : null}
        {id === "follow-up" ? (
          <div>
            <div className="flex flex-wrap gap-1.5">
              {FOLLOW_UP_CATEGORY_OPTIONS.map((option) => {
                const selected = option.value === "due-now";
                return (
                  <span
                    key={option.value}
                    className={cn(
                      "inline-flex items-center rounded-xl border px-2.5 py-1.5 text-xs font-medium",
                      selected
                        ? "border-border-warm bg-background text-text-warm shadow-sm"
                        : "border-transparent bg-muted/40 text-text-muted-warm"
                    )}
                  >
                    {option.label}
                  </span>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-border-warm px-3 py-3">
              <PersonAvatar name="New registration" size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-text-warm">New registration</p>
                <p className="truncate text-sm text-text-muted-warm">No outreach yet</p>
              </div>
              <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-text-warm">
                Due now
              </span>
            </div>
          </div>
        ) : null}
        {id === "website-studio" ? (
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-text-warm">Website Studio</p>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[0.625rem] font-medium uppercase text-text-warm">
                Core
              </span>
            </div>
            <p className="mt-2 text-sm text-text-muted-warm">Site Page</p>
            <p className="mt-3 text-xs text-text-muted-warm">Preview</p>
          </div>
        ) : null}
        {id === "form-studio" ? (
          <div>
            <p className="font-medium text-text-warm">Form Studio</p>
            <ul className="mt-3 space-y-2">
              {["Name", "Email", "Phone"].map((field) => (
                <li
                  key={field}
                  className="rounded-xl border border-border-warm px-3 py-2 text-sm text-text-warm"
                >
                  {field}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {id === "analytics" ? (
          <div>
            <p className="font-medium text-text-warm">Registration report</p>
            <p className="mt-2 text-sm text-text-muted-warm">CSV export</p>
            <p className="mt-3 text-xs text-text-muted-warm">
              Core adds filters. Pro adds saved views.
            </p>
          </div>
        ) : null}
      </div>
      <figcaption className="border-t border-border-warm px-4 py-3 text-xs leading-relaxed text-text-muted-warm">
        {FRAME_CAPTION}
      </figcaption>
    </figure>
  );
}

export function MarketingCapabilityChapters({
  chapters,
}: {
  chapters: LandingCapabilityChapter[];
}) {
  const [activeId, setActiveId] = useState(chapters[0]?.id ?? "registration");

  useEffect(() => {
    const update = () => {
      const line = window.innerHeight * 0.35;
      let nextId = chapters[0]?.id ?? "registration";
      for (const chapter of chapters) {
        const node = document.getElementById(chapter.id);
        if (!node) {
          continue;
        }
        if (node.getBoundingClientRect().top <= line) {
          nextId = chapter.id;
        }
      }
      setActiveId(nextId);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [chapters]);

  const shownId = chapters.some((chapter) => chapter.id === activeId)
    ? activeId
    : (chapters[0]?.id ?? "registration");

  return (
    <section
      id="capabilities"
      className="scroll-mt-24 border-t border-line bg-paper-warm"
      aria-label="Product capabilities"
    >
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <MarketingReveal delayMs={marketingRevealDelay(0)} className="max-w-2xl">
          <p className="text-section text-text-accent">Capabilities</p>
          <h2 className="text-marketing-section mt-4 max-w-[22ch] text-ink">
            One workspace from registration to analytics
          </h2>
          <p className="text-marketing-lead mt-4 text-muted-foreground">
            Each capability below is a room in the same operator workspace. Copy stays inside what
            ships today.
          </p>
        </MarketingReveal>

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-start lg:gap-16">
          <div className="min-w-0">
            <nav aria-label="Capability chapters">
              <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:border-l lg:border-line lg:pb-0">
                {chapters.map((chapter) => {
                  const current = chapter.id === shownId;
                  return (
                    <li key={chapter.id} className="shrink-0 lg:shrink">
                      <Link
                        href={`#${chapter.id}`}
                        aria-current={current ? "true" : undefined}
                        className={cn(
                          "block rounded-xl px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lagoon focus-visible:ring-offset-2",
                          "lg:rounded-none lg:border-l-2 lg:px-4",
                          current
                            ? "border-lagoon bg-background text-ink lg:bg-transparent"
                            : "border-transparent text-muted-foreground hover:text-ink"
                        )}
                      >
                        {chapter.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <ol className="mt-8 min-w-0 space-y-10 lg:space-y-16">
              {chapters.map((chapter, index) => (
                <MarketingReveal
                  key={chapter.id}
                  as="li"
                  delayMs={marketingRevealDelay(index + 1)}
                  id={chapter.id}
                  className="scroll-mt-28 border-t border-line pt-8 first:border-t-0 first:pt-0"
                >
                  <p className="text-section text-text-accent">{chapter.plan}</p>
                  <h3 className="mt-2 font-[family-name:var(--font-fraunces)] text-[1.5rem] font-medium tracking-[-0.025em] text-ink">
                    {chapter.title}
                  </h3>
                  <p className="mt-3 max-w-[46ch] text-[0.95rem] leading-relaxed text-muted-foreground">
                    {chapter.description}
                  </p>
                  <div className="mt-5 lg:hidden">
                    <ChapterFrame id={chapter.id} />
                  </div>
                </MarketingReveal>
              ))}
            </ol>
          </div>

          <div className="sticky top-28 hidden motion-reduce:transition-none lg:block">
            <ChapterFrame id={shownId} />
          </div>
        </div>
      </div>
    </section>
  );
}
