"use client";

import Link from "next/link";

import {
  MarketingFooter,
  MarketingShell,
  marketingAtelierButtonClass,
} from "@/components/marketing/marketing-shell";
import { MarketingReveal, marketingRevealDelay } from "@/components/marketing/marketing-reveal";
import { useMarketingHeaderScroll } from "@/components/marketing/use-marketing-header-scroll";
import {
  MARKETING_PLANS,
  PRICING_COMPARE_ROWS,
  PRICING_FAQ,
} from "@/lib/marketing/pricing-plans";
import { cn } from "@/lib/utils";

export function PricingPageContent() {
  const { scrolled, anchorRef } = useMarketingHeaderScroll(true);

  return (
    <MarketingShell scrolled={scrolled}>
      <div ref={anchorRef} aria-hidden className="pointer-events-none absolute top-0 h-px w-full" />

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
        <MarketingReveal immediate delayMs={80}>
          <p className="text-section text-gold">Pricing</p>
          <h1 className="text-marketing-section mt-4 max-w-[18ch] text-ink">
            Turn events into clients — without spreadsheet chaos
          </h1>
          <p className="text-marketing-lead mt-4 max-w-2xl text-stone">
            Start free on Basic. Upgrade when you need a public homepage, richer reports, a team,
            or Pro marketing tools.
          </p>
        </MarketingReveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
          {MARKETING_PLANS.map((plan, index) => (
            <MarketingReveal
              key={plan.id}
              delayMs={marketingRevealDelay(index, 120, 70)}
              className={cn(
                "flex h-full flex-col rounded-[16px] border bg-paper p-6",
                plan.highlighted
                  ? "border-lagoon shadow-[0_28px_60px_rgba(7,13,18,0.08)]"
                  : "border-line"
              )}
            >
              <div className="flex-1">
                <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-medium tracking-[-0.03em] text-ink">
                  {plan.name}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-stone">{plan.headline}</p>

                <div className="mt-6 space-y-1">
                  {plan.annualMonthlyEquivalent ? (
                    <p className="font-[family-name:var(--font-fraunces)] text-3xl font-medium tracking-[-0.03em] text-ink">
                      {plan.annualMonthlyEquivalent}
                    </p>
                  ) : null}
                  {plan.monthlyPrice ? (
                    <p
                      className={cn(
                        "text-ink",
                        plan.annualMonthlyEquivalent
                          ? "text-sm text-stone"
                          : "font-[family-name:var(--font-fraunces)] text-3xl font-medium tracking-[-0.03em]"
                      )}
                    >
                      {plan.annualMonthlyEquivalent ? `Or ${plan.monthlyPrice} / month` : plan.monthlyPrice}
                    </p>
                  ) : null}
                  {plan.annualPrice ? (
                    <p className="text-sm text-stone">{plan.annualPrice}</p>
                  ) : null}
                </div>

                {plan.trialNote ? (
                  <p className="mt-3 text-xs leading-relaxed text-stone">{plan.trialNote}</p>
                ) : null}

                <ul className="mt-6 space-y-2 text-sm leading-relaxed text-stone">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span aria-hidden className="text-lagoon">
                        ·
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={plan.ctaHref}
                className={cn(
                  marketingAtelierButtonClass(
                    plan.id === "basic" ? "lagoon" : plan.id === "enterprise" ? "ink" : "ghost"
                  ),
                  "mt-8 w-full"
                )}
              >
                {plan.ctaLabel}
              </Link>
            </MarketingReveal>
          ))}
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

        <MarketingReveal delayMs={marketingRevealDelay(PRICING_FAQ.length + 2)} className="mt-12">
          <Link href="/signup" className={marketingAtelierButtonClass("lagoon")}>
            Start free on Basic
          </Link>
        </MarketingReveal>
      </section>

      <MarketingFooter />
    </MarketingShell>
  );
}
