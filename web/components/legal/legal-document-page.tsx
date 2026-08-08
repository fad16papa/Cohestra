"use client";

import Link from "next/link";

import {
  MarketingFooter,
  MarketingShell,
  marketingAtelierButtonClass,
} from "@/components/marketing/marketing-shell";
import { MarketingReveal } from "@/components/marketing/marketing-reveal";
import { useMarketingHeaderScroll } from "@/components/marketing/use-marketing-header-scroll";
import type { LegalSection } from "@/lib/legal/legal-content";

export function LegalDocumentPage({
  eyebrow,
  title,
  version,
  sections,
  effectiveLabel,
}: {
  eyebrow: string;
  title: string;
  version: string;
  sections: LegalSection[];
  effectiveLabel: string;
}) {
  const { scrolled, anchorRef } = useMarketingHeaderScroll(true);

  return (
    <MarketingShell scrolled={scrolled}>
      <div ref={anchorRef} aria-hidden className="pointer-events-none absolute top-0 h-px w-full" />

      <article className="mx-auto max-w-3xl flex-1 px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
        <MarketingReveal immediate delayMs={80}>
          <p className="text-section text-gold">{eyebrow}</p>
          <h1 className="text-marketing-section mt-4 text-ink">{title}</h1>
          <p className="mt-3 text-sm text-stone">
            {effectiveLabel}: <span className="font-medium text-ink">{version}</span>
          </p>
        </MarketingReveal>

        <div className="mt-10 space-y-10 border-t border-line pt-10">
          {sections.map((section, index) => (
            <MarketingReveal key={section.id} delayMs={120 + index * 60}>
              <section id={section.id} className="scroll-mt-28">
                <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-medium tracking-[-0.03em] text-ink">
                  {section.title}
                </h2>
                <div className="mt-4 space-y-3 text-sm leading-relaxed text-stone sm:text-[0.9375rem]">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            </MarketingReveal>
          ))}
        </div>

        <MarketingReveal delayMs={400} className="mt-12">
          <Link href="/signup" className={marketingAtelierButtonClass("lagoon")}>
            Back to Start free
          </Link>
        </MarketingReveal>
      </article>

      <MarketingFooter />
    </MarketingShell>
  );
}
