"use client";

import Link from "next/link";

import type { LandingCapabilityChapter } from "@/lib/marketing/landing-content";
import { MarketingReveal, marketingRevealDelay } from "@/components/marketing/marketing-reveal";

export function MarketingCapabilityChapters({
  chapters,
}: {
  chapters: LandingCapabilityChapter[];
}) {
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

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:items-start lg:gap-16">
          <nav
            aria-label="Capability chapters"
            className="hidden lg:sticky lg:top-28 lg:block"
          >
            <p className="text-section text-text-accent">In this workspace</p>
            <ul className="mt-4 space-y-1 border-l border-line">
              {chapters.map((chapter) => (
                <li key={chapter.id}>
                  <Link
                    href={`#${chapter.id}`}
                    className="block border-l-2 border-transparent py-2 pl-4 text-sm font-medium text-muted-foreground hover:border-lagoon hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lagoon focus-visible:ring-offset-2"
                  >
                    {chapter.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <ol className="min-w-0 space-y-10 lg:space-y-16">
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
              </MarketingReveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
