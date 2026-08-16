"use client";

import Link from "next/link";
import { useState } from "react";

import { marketingAtelierButtonClass, marketingCardClass } from "@/components/marketing/marketing-shell";
import { MarketingReveal, marketingRevealDelay } from "@/components/marketing/marketing-reveal";
import { MARKETING_PLANS } from "@/lib/marketing/pricing-plans";
import { cn } from "@/lib/utils";

export type PricingInterval = "monthly" | "annual";

export function planCtaHref(
  planId: string,
  baseHref: string,
  interval: PricingInterval
): string {
  if (planId !== "core" && planId !== "pro") {
    return baseHref;
  }

  const url = new URL(baseHref, "https://cohestra.local");
  url.searchParams.set("interval", interval);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export function PricingIntervalToggle({
  interval,
  onChange,
}: {
  interval: PricingInterval;
  onChange: (value: PricingInterval) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Billing interval"
      className="inline-flex max-w-full flex-wrap rounded-[12px] border border-line bg-paper-warm p-1"
    >
      {(["monthly", "annual"] as const).map((value) => {
        const active = interval === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(value)}
            className={cn(
              "rounded-[10px] px-4 py-2 text-sm font-semibold transition-colors",
              active ? "bg-paper text-ink shadow-sm" : "text-stone hover:text-ink"
            )}
          >
            {value === "monthly" ? "Monthly" : "Yearly"}
            {value === "annual" ? (
              <span className="ml-1.5 text-xs font-medium text-lagoon">Save ~17%</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function PricingPlanGrid({ interval }: { interval: PricingInterval }) {
  return (
    <div className="grid items-stretch gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
      {MARKETING_PLANS.map((plan, index) => {
        const showAnnual = interval === "annual" && Boolean(plan.annualMonthlyEquivalent);
        const pricePrimary = showAnnual ? plan.annualMonthlyEquivalent : plan.monthlyPrice;
        const priceSecondary = showAnnual
          ? plan.annualPrice
          : plan.annualMonthlyEquivalent
            ? `Or ${plan.annualMonthlyEquivalent}`
            : null;

        return (
          <MarketingReveal
            key={plan.id}
            delayMs={marketingRevealDelay(index, 120, 70)}
            className={cn(
              marketingCardClass(
                plan.highlighted ? "highlighted" : "default",
                "relative grid h-full min-h-0 grid-rows-[auto_auto_1fr_auto] p-6 sm:min-h-[480px] xl:min-h-[520px]"
              ),
              plan.highlighted && "shadow-[0_28px_60px_rgba(7,13,18,0.08)]"
            )}
          >
            {plan.highlighted ? (
              <span className="absolute -top-3 left-6 rounded-full bg-lagoon px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-wide text-lagoon-fg">
                Most popular
              </span>
            ) : null}

            <div>
              <h3 className="font-[family-name:var(--font-fraunces)] text-2xl font-medium tracking-[-0.03em] text-ink">
                {plan.name}
              </h3>
              <p className="mt-2 min-h-[2.75rem] text-sm leading-relaxed text-stone">{plan.headline}</p>
            </div>

            <div className="mt-4 min-h-[7.25rem]">
              {pricePrimary ? (
                <p className="font-[family-name:var(--font-fraunces)] text-3xl font-medium tracking-[-0.03em] text-ink">
                  {pricePrimary}
                </p>
              ) : null}
              {priceSecondary ? <p className="mt-1 text-sm text-stone">{priceSecondary}</p> : null}
              {plan.trialNote ? (
                <p className="mt-3 text-xs leading-relaxed text-stone">{plan.trialNote}</p>
              ) : (
                <p className="mt-3 text-xs leading-relaxed text-transparent select-none" aria-hidden>
                  &nbsp;
                </p>
              )}
            </div>

            <ul className="mt-6 space-y-2 text-sm leading-relaxed text-stone">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span aria-hidden className="mt-0.5 shrink-0 text-lagoon">
                    ✓
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href={planCtaHref(plan.id, plan.ctaHref, interval)}
              className={cn(
                marketingAtelierButtonClass(
                  plan.id === "basic" ? "lagoon" : plan.id === "enterprise" ? "ink" : "ghost"
                ),
                "mt-6 w-full self-end"
              )}
            >
              {plan.ctaLabel}
            </Link>
          </MarketingReveal>
        );
      })}
    </div>
  );
}

export function usePricingInterval(initial: PricingInterval = "monthly") {
  return useState<PricingInterval>(initial);
}
