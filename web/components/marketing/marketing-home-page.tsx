"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

import { useAuth } from "@/components/auth/auth-provider";
import {
  MarketingFooter,
  MarketingShell,
  marketingAtelierButtonClass,
} from "@/components/marketing/marketing-shell";
import { MarketingReveal, marketingRevealDelay } from "@/components/marketing/marketing-reveal";
import { useMarketingHeaderScroll } from "@/components/marketing/use-marketing-header-scroll";
import { resolvePostLoginPath } from "@/lib/auth-api";
import { cn } from "@/lib/utils";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1526232761682-d26e03ac149e?auto=format&fit=crop&w=1200&q=80";

const ATELIER_CELLS = [
  {
    eyebrow: "In place of Forms",
    title: "Registration as welcome",
    description: "A number, a confirmation, a name that stays — not a row lost in Drive.",
  },
  {
    eyebrow: "In place of spreadsheets",
    title: "Memory across activities",
    description: "Deduped clients and timelines. See returners without weekend VLOOKUPs.",
  },
  {
    eyebrow: "In place of Linktree",
    title: "A public door that works",
    description: "Share one page. Every register lands in your atelier, not a dead bio link.",
  },
] as const;

const FLOAT_ROWS = [
  { name: "Elena M.", meta: "Sunday clinic", pill: "New" },
  { name: "Sam R.", meta: "Clinic · also board games", pill: "Returning" },
  { name: "Jordan K.", meta: "Youth open play", pill: "New" },
] as const;

export function MarketingHomePage() {
  const { status, profile } = useAuth();
  const { scrolled, anchorRef } = useMarketingHeaderScroll(true);

  useEffect(() => {
    if (status === "authenticated" && profile) {
      window.location.replace(resolvePostLoginPath(profile));
    }
  }, [profile, status]);

  return (
    <MarketingShell scrolled={scrolled}>
      <div ref={anchorRef} aria-hidden className="pointer-events-none absolute top-0 h-px w-full" />

      <section className="mx-auto grid max-w-6xl flex-1 gap-10 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:gap-14 lg:px-10 lg:pb-20 lg:pt-12">
        <div>
          <MarketingReveal immediate delayMs={50}>
            <p className="text-section text-gold">Community operations · Refined</p>
          </MarketingReveal>

          <MarketingReveal immediate delayMs={120}>
            <h1 className="text-marketing-hero mt-5 text-balance text-ink">Cohestra</h1>
          </MarketingReveal>

          <MarketingReveal immediate delayMs={220}>
            <p className="text-marketing-promise mt-6 max-w-[16ch] text-ink">
              Remember every person who walked through the door.
            </p>
          </MarketingReveal>

          <MarketingReveal immediate delayMs={300}>
            <p className="text-marketing-lead mt-4 max-w-[34ch] text-stone">
              QR registrations become a living client list — hospitality-grade ops for clubs and
              studios that outgrew spreadsheets.
            </p>
          </MarketingReveal>

          <MarketingReveal immediate delayMs={380}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className={marketingAtelierButtonClass("lagoon")}>
                Start free
              </Link>
              <Link href="/signup?plan=core" className={marketingAtelierButtonClass("ghost")}>
                Start trial
              </Link>
            </div>
          </MarketingReveal>

          <MarketingReveal immediate delayMs={450}>
            <p className="mt-4 text-sm text-stone">
              No card on Basic · Ready before your next session
            </p>
          </MarketingReveal>
        </div>

        <div className="marketing-product-lift relative">
          <figure className="relative aspect-[4/5] max-h-[640px] overflow-hidden rounded-[24px] shadow-[0_40px_80px_rgba(7,13,18,0.16)]">
            <Image
              src={HERO_IMAGE}
              alt="People gathering for community sport at dusk"
              fill
              priority
              className="object-cover saturate-[0.92] contrast-[1.05]"
              sizes="(max-width: 1024px) 100vw, 540px"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-b from-ink/[0.05] to-ink/45"
            />
            <figcaption className="absolute inset-x-6 bottom-6 z-[2] text-paper">
              <span className="text-section mb-2 block text-gold">Sunday clinic · Ikigai</span>
              <span className="font-[family-name:var(--font-fraunces)] text-lg leading-snug tracking-[-0.02em]">
                The list that knows who came back.
              </span>
            </figcaption>
          </figure>

          <aside
            aria-label="Live clients preview"
            className={cn(
              "absolute z-[3] w-[min(100%,300px)] rounded-[16px] border border-line bg-paper p-4 shadow-[0_28px_60px_rgba(7,13,18,0.2)]",
              "right-0 bottom-[18%] max-lg:relative max-lg:mx-4 max-lg:-mt-12 max-lg:mb-0 max-lg:w-auto max-lg:max-w-none"
            )}
          >
            <p className="text-label mb-3 text-gold">Tonight&apos;s clients</p>
            {FLOAT_ROWS.map((row) => (
              <div
                key={row.name}
                className="flex items-baseline justify-between border-t border-line py-2.5 first:border-t-0 first:pt-0"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{row.name}</p>
                  <p className="text-xs text-stone">{row.meta}</p>
                </div>
                <span className="rounded-sm bg-lagoon/10 px-2 py-0.5 text-[0.625rem] font-bold tracking-wide text-lagoon uppercase">
                  {row.pill}
                </span>
              </div>
            ))}
          </aside>
        </div>
      </section>

      <section id="atelier" className="mx-auto max-w-6xl scroll-mt-28 px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="grid gap-8 border-t border-line pt-16 lg:grid-cols-2 lg:items-end">
          <MarketingReveal delayMs={marketingRevealDelay(0)}>
            <h2 className="text-marketing-section max-w-[12ch] text-ink">
              One atelier. Not five tools.
            </h2>
          </MarketingReveal>
          <MarketingReveal delayMs={marketingRevealDelay(1)}>
            <p className="max-w-[36ch] text-[1.05rem] leading-relaxed text-stone">
              Forms, sheets, link-in-bio, and light email collapse into a single composed workspace
              — quiet enough to trust, sharp enough to run on.
            </p>
          </MarketingReveal>
        </div>

        <div className="mt-14 grid border-t border-line lg:grid-cols-3">
          {ATELIER_CELLS.map((cell, index) => (
            <MarketingReveal
              key={cell.title}
              delayMs={marketingRevealDelay(index + 2)}
              className={cn(
                "border-line py-7 lg:border-r lg:pr-7",
                index === ATELIER_CELLS.length - 1 && "lg:border-r-0 lg:pr-0",
                index > 0 && "border-t lg:border-t-0"
              )}
            >
              <p className="text-section mb-3 text-gold">{cell.eyebrow}</p>
              <h3 className="font-[family-name:var(--font-fraunces)] text-[1.35rem] font-medium tracking-[-0.025em] text-ink">
                {cell.title}
              </h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-stone">{cell.description}</p>
            </MarketingReveal>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </MarketingShell>
  );
}
