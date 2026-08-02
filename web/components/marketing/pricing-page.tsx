"use client";

import Link from "next/link";
import { useState } from "react";

import {
  MarketingFooter,
  MarketingShell,
  marketingAtelierButtonClass,
} from "@/components/marketing/marketing-shell";
import { MarketingReveal, marketingRevealDelay } from "@/components/marketing/marketing-reveal";
import {
  PricingIntervalToggle,
  PricingPlanGrid,
  type PricingInterval,
} from "@/components/marketing/marketing-pricing-cards";
import { useMarketingHeaderScroll } from "@/components/marketing/use-marketing-header-scroll";
import { PRICING_COMPARE_ROWS, PRICING_FAQ } from "@/lib/marketing/pricing-plans";

export function PricingPageContent() {
  const { scrolled, anchorRef } = useMarketingHeaderScroll(true);
  const [interval, setInterval] = useState<PricingInterval>("monthly");

  return (
    <MarketingShell scrolled={scrolled}>
      <div ref={anchorRef} aria-hidden className="pointer-events-none absolute top-0 h-px w-full" />

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
        <MarketingReveal immediate delayMs={80}>
          <p className="text-section text-gold">Pricing</p>
          <h1 className="text-marketing-section mt-4 max-w-[18ch] text-ink">
            Plans for clubs at every stage
          </h1>
          <p className="text-marketing-lead mt-4 max-w-2xl text-stone">
            Start free on Basic. Upgrade when you need a public homepage, richer reports, a team,
            or Pro marketing tools.
          </p>
        </MarketingReveal>

        <MarketingReveal delayMs={140} className="mt-8">
          <PricingIntervalToggle interval={interval} onChange={setInterval} />
        </MarketingReveal>

        <div className="mt-10">
          <PricingPlanGrid interval={interval} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-12 sm:px-8 lg:px-10">
        <MarketingReveal delayMs={marketingRevealDelay(0)}>
          <h2 className="text-marketing-section text-ink">Compare plans</h2>
        </MarketingReveal>

        <div className="mt-8 overflow-x-auto rounded-[16px] border border-line">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-paper-warm">
                <th className="px-4 py-3 font-semibold text-ink">Feature</th>
                <th className="px-4 py-3 font-semibold text-ink">Basic</th>
                <th className="px-4 py-3 font-semibold text-ink">Core</th>
                <th className="px-4 py-3 font-semibold text-ink">Pro</th>
              </tr>
            </thead>
            <tbody>
              {PRICING_COMPARE_ROWS.map((row) => (
                <tr key={row.feature} className="border-b border-line last:border-b-0">
                  <th scope="row" className="px-4 py-3 font-medium text-ink">
                    {row.feature}
                  </th>
                  <td className="px-4 py-3 text-stone">{row.basic}</td>
                  <td className="px-4 py-3 text-stone">{row.core}</td>
                  <td className="px-4 py-3 text-stone">{row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-16 sm:px-8 lg:px-10">
        <MarketingReveal delayMs={marketingRevealDelay(1)}>
          <h2 className="text-marketing-section text-ink">FAQ</h2>
        </MarketingReveal>

        <dl className="mt-8 space-y-6">
          {PRICING_FAQ.map((item, index) => (
            <MarketingReveal key={item.question} delayMs={marketingRevealDelay(index + 2)}>
              <div className="border-t border-line pt-6 first:border-t-0 first:pt-0">
                <dt className="font-semibold text-ink">{item.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-stone">{item.answer}</dd>
              </div>
            </MarketingReveal>
          ))}
        </dl>

        <MarketingReveal delayMs={marketingRevealDelay(PRICING_FAQ.length + 2)} className="mt-12 space-y-3">
          <Link href="/signup" className={marketingAtelierButtonClass("lagoon")}>
            Start free on Basic
          </Link>
          <p className="text-xs text-stone">
            Prices are in USD and may be exclusive of applicable taxes. Stripe Tax is not enabled in
            v1. Stripe Checkout may show a local currency estimate based on your location.
          </p>
        </MarketingReveal>
      </section>

      <MarketingFooter />
    </MarketingShell>
  );
}
