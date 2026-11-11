"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import {
  MarketingFooter,
  MarketingShell,
  marketingAtelierButtonClass,
  marketingCardClass,
} from "@/components/marketing/marketing-shell";
import { MarketingCapabilityChapters } from "@/components/marketing/marketing-capability-chapters";
import { MarketingHeroProductStack } from "@/components/marketing/marketing-hero-product-stack";
import {
  MarketingReveal,
  marketingRevealDelay,
} from "@/components/marketing/marketing-reveal";
import {
  PricingIntervalToggle,
  PricingPlanGrid,
  type PricingInterval,
} from "@/components/marketing/marketing-pricing-cards";
import { useMarketingHeaderScroll } from "@/components/marketing/use-marketing-header-scroll";
import {
  LANDING_AUDIENCES,
  LANDING_CAPABILITY_CHAPTERS,
  LANDING_FAQ,
} from "@/lib/marketing/landing-content";
import { PRICING_POSITIONING_LINE } from "@/lib/marketing/pricing-plans";
import { resolvePostLoginPath } from "@/lib/auth-api";
import { cn } from "@/lib/utils";

const HERO_VALUE_LINE =
  "Public registration, client profiles, follow-up, and analytics stay on one operator list.";

export function MarketingHomePage() {
  const { status, profile } = useAuth();
  const { scrolled, anchorRef } = useMarketingHeaderScroll(true);
  const [interval, setInterval] = useState<PricingInterval>("monthly");

  useEffect(() => {
    if (status === "authenticated" && profile) {
      window.location.replace(resolvePostLoginPath(profile));
    }
  }, [profile, status]);

  return (
    <MarketingShell scrolled={scrolled} showAmbient={false}>
      <div ref={anchorRef} aria-hidden className="pointer-events-none absolute top-0 h-px w-full" />

      <section
        aria-labelledby="marketing-hero-heading"
        className="mx-auto max-w-6xl px-5 pb-10 pt-4 text-center sm:px-8 lg:px-10 lg:pb-12 lg:pt-6"
      >
        <MarketingReveal immediate delayMs={50}>
          <p className="text-section text-text-accent">Community operations</p>
        </MarketingReveal>

        <MarketingReveal immediate delayMs={120}>
          <h1
            id="marketing-hero-heading"
            className="mx-auto mt-3 max-w-[20ch] text-balance font-[family-name:var(--font-fraunces)] text-[clamp(2.5rem,5vw,4.25rem)] font-medium leading-[1.08] tracking-[-0.04em] text-ink"
          >
            Know who registered, and who still needs a reply
          </h1>
        </MarketingReveal>

        <MarketingReveal immediate delayMs={220}>
          <p className="text-marketing-lead mx-auto mt-4 max-w-[48ch] text-muted-foreground">
            {HERO_VALUE_LINE}
          </p>
        </MarketingReveal>

        <MarketingReveal immediate delayMs={300}>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className={marketingAtelierButtonClass("lagoon")}>
              Start free
            </Link>
            <Link href="#pricing" className={marketingAtelierButtonClass("ghost")}>
              See pricing
            </Link>
          </div>
        </MarketingReveal>

        <MarketingReveal immediate delayMs={360}>
          <p className="mx-auto mt-4 max-w-[48ch] text-sm text-muted-foreground">
            Basic is free. No credit card. Website Studio is on Core. Campaigns are on Pro.
          </p>
        </MarketingReveal>
      </section>

      <section
        aria-label="Product preview"
        className="mx-auto max-w-6xl px-5 pb-12 sm:px-8 lg:px-10 lg:pb-16"
      >
        <MarketingHeroProductStack className="mx-auto max-w-3xl" />
      </section>

      <section aria-label="Who Cohestra is for" className="border-y border-line bg-paper-warm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-6 sm:px-8 lg:px-10">
          <p className="text-section text-text-accent">Built for</p>
          {LANDING_AUDIENCES.map((audience) => (
            <span key={audience.label} className="text-sm font-medium tracking-tight text-ink">
              {audience.label}
            </span>
          ))}
        </div>
      </section>

      <MarketingCapabilityChapters chapters={LANDING_CAPABILITY_CHAPTERS} />

      <section
        id="pricing"
        className="relative mx-auto max-w-6xl scroll-mt-24 px-5 py-16 sm:px-8 lg:px-10 lg:py-24"
      >
        <div className="relative z-[1]">
          <MarketingReveal delayMs={marketingRevealDelay(0)}>
            <p className="text-section text-text-accent">Pricing</p>
            <h2 className="text-marketing-section mt-4 max-w-[18ch] text-ink">
              Start free. Upgrade when you grow.
            </h2>
            <p className="text-marketing-lead mt-4 max-w-2xl text-muted-foreground">
              Basic is free. Core and Pro include a 30-day trial. You are not charged until the
              trial ends.
            </p>
            <p className="mt-3 max-w-2xl text-sm font-medium text-lagoon">{PRICING_POSITIONING_LINE}</p>
          </MarketingReveal>

          <MarketingReveal delayMs={140} className="mt-8">
            <PricingIntervalToggle interval={interval} onChange={setInterval} />
          </MarketingReveal>

          <div className="mt-10">
            <PricingPlanGrid interval={interval} />
          </div>

          <MarketingReveal delayMs={marketingRevealDelay(5)} className="mt-8">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-lagoon hover:text-lagoon-deep"
            >
              Compare all plan features
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </MarketingReveal>
        </div>
      </section>

      <section id="faq" className="border-t border-line bg-paper-warm">
        <div className="mx-auto max-w-3xl scroll-mt-24 px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          <MarketingReveal delayMs={marketingRevealDelay(0)}>
            <p className="text-section text-text-accent">FAQ</p>
            <h2 className="text-marketing-section mt-4 text-ink">Questions, answered</h2>
          </MarketingReveal>

          <dl className="mt-10 space-y-6">
            {LANDING_FAQ.map((item, index) => (
              <MarketingReveal key={item.question} delayMs={marketingRevealDelay(index + 1)}>
                <div className={marketingCardClass("default", "p-5")}>
                  <dt className="font-semibold text-ink">{item.question}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.answer}</dd>
                </div>
              </MarketingReveal>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          <MarketingReveal
            delayMs={marketingRevealDelay(0)}
            className="rounded-[24px] bg-ink px-6 py-12 text-center sm:px-12 lg:py-16"
          >
            <p className="text-section text-gold">Ready when you are</p>
            <h2 className="text-marketing-section mx-auto mt-4 max-w-[22ch] text-balance text-paper">
              Open a workspace and publish an activity
            </h2>
            <p className="mx-auto mt-4 max-w-[46ch] text-[1.02rem] leading-relaxed text-paper/85">
              Create a free Basic account, verify your email, and share the registration page or QR
              code. Core and Pro trials wait until you choose them.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/signup" className={marketingAtelierButtonClass("lagoon")}>
                Start free
              </Link>
              <Link
                href="/login"
                className={cn(
                  "marketing-atelier-btn inline-flex h-12 items-center justify-center rounded-[10px] border border-paper/25 bg-transparent px-5 text-sm font-semibold text-paper hover:border-paper/50 hover:bg-paper/5"
                )}
              >
                Sign in
              </Link>
            </div>
            <p className="mt-4 text-xs text-paper/70">
              Free on Basic. 30-day trials on Core and Pro.
            </p>
          </MarketingReveal>
        </div>
      </section>

      <MarketingFooter />
    </MarketingShell>
  );
}
