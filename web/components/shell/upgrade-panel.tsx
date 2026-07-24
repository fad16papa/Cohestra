"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Lock } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { MARKETING_PLANS, type MarketingPlan } from "@/lib/marketing/pricing-plans";
import { cn } from "@/lib/utils";

export type UpgradeRequiredPlan = "Core" | "Pro";
export type BillingIntervalChoice = "monthly" | "annual";

type UpgradePanelProps = {
  title: string;
  description: string;
  requiredPlan: UpgradeRequiredPlan;
  isTenantAdmin: boolean;
  /** When set, skips the chooser and links straight to this href (legacy). */
  checkoutHref?: string;
  className?: string;
};

function planOptionsFor(requiredPlan: UpgradeRequiredPlan): MarketingPlan[] {
  const core = MARKETING_PLANS.find((p) => p.id === "core");
  const pro = MARKETING_PLANS.find((p) => p.id === "pro");
  if (requiredPlan === "Pro") {
    return pro ? [pro] : [];
  }

  return [core, pro].filter((p): p is MarketingPlan => p != null);
}

export function buildCheckoutHref(
  planId: "core" | "pro",
  interval: BillingIntervalChoice
): string {
  return `/billing/checkout?plan=${planId}&interval=${interval}`;
}

function planPriceLabel(plan: MarketingPlan, interval: BillingIntervalChoice): string {
  if (interval === "annual") {
    return plan.annualMonthlyEquivalent ?? plan.annualPrice ?? "";
  }

  if (!plan.monthlyPrice || plan.monthlyPrice === "Free" || plan.monthlyPrice === "Custom") {
    return plan.monthlyPrice ?? "";
  }

  return `${plan.monthlyPrice} / mo`;
}

function IntervalToggle({
  interval,
  onChange,
  className,
}: {
  interval: BillingIntervalChoice;
  onChange: (next: BillingIntervalChoice) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Billing interval"
      className={cn(
        "inline-flex w-full rounded-xl border border-border-warm bg-muted/40 p-1 sm:w-auto",
        className
      )}
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
              "flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors sm:flex-none",
              active
                ? "bg-background text-text-warm shadow-sm"
                : "text-text-muted-warm hover:text-text-warm"
            )}
          >
            {value === "monthly" ? "Monthly" : "Yearly"}
            {value === "annual" ? (
              <span className="ml-1.5 text-xs font-normal text-primary">Save ~17%</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function FeatureList({
  features,
  columns = false,
}: {
  features: string[];
  columns?: boolean;
}) {
  return (
    <ul
      className={cn(
        "gap-x-6 gap-y-2.5 text-sm leading-relaxed text-text-muted-warm",
        columns ? "grid sm:grid-cols-2" : "space-y-2.5"
      )}
    >
      {features.map((feature) => (
        <li key={feature} className="flex gap-2.5">
          <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}

function SelectablePlanCard({
  plan,
  interval,
  active,
  requiredPlan,
  onSelect,
}: {
  plan: MarketingPlan;
  interval: BillingIntervalChoice;
  active: boolean;
  requiredPlan: UpgradeRequiredPlan;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={cn(
        "flex h-full flex-col rounded-2xl border p-5 text-left transition-colors sm:p-6",
        active
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : "border-border-warm bg-background hover:border-primary/40"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold text-text-warm">{plan.name}</p>
            {requiredPlan === "Core" && plan.id === "core" ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-text-muted-warm">
                Minimum for this feature
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-text-muted-warm">{plan.headline}</p>
        </div>
        {active ? <Check className="mt-1 size-5 shrink-0 text-primary" aria-hidden /> : null}
      </div>

      <div className="mt-4">
        <p className="text-2xl font-semibold tracking-tight text-text-warm">
          {planPriceLabel(plan, interval)}
        </p>
        {interval === "annual" && plan.annualPrice ? (
          <p className="mt-1 text-sm text-text-muted-warm">{plan.annualPrice}</p>
        ) : plan.annualMonthlyEquivalent ? (
          <p className="mt-1 text-sm text-text-muted-warm">
            or {plan.annualMonthlyEquivalent}
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex-1">
        <FeatureList features={plan.features} />
      </div>
    </button>
  );
}

function ProOnlyPlanCard({
  plan,
  interval,
}: {
  plan: MarketingPlan;
  interval: BillingIntervalChoice;
}) {
  return (
    <article className="rounded-2xl border border-border-warm bg-muted/20 p-5 sm:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
        <div className="min-w-0 lg:w-[15.5rem] lg:shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-xl font-semibold text-text-warm">{plan.name}</h3>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-primary">
                Unlocks this feature
              </p>
            </div>
            <Check className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-text-muted-warm">{plan.headline}</p>
          <div className="mt-5">
            <p className="text-3xl font-semibold tracking-tight text-text-warm">
              {planPriceLabel(plan, interval)}
            </p>
            {interval === "annual" && plan.annualPrice ? (
              <p className="mt-1 text-sm text-text-muted-warm">{plan.annualPrice}</p>
            ) : plan.annualMonthlyEquivalent ? (
              <p className="mt-1 text-sm text-text-muted-warm">
                or {plan.annualMonthlyEquivalent}
              </p>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 flex-1 border-t border-border-warm pt-5 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted-warm">
            Included with Pro
          </p>
          <FeatureList features={plan.features} columns />
        </div>
      </div>
    </article>
  );
}

export function UpgradePanel({
  title,
  description,
  requiredPlan,
  isTenantAdmin,
  checkoutHref,
  className,
}: UpgradePanelProps) {
  const options = useMemo(() => planOptionsFor(requiredPlan), [requiredPlan]);
  const proOnly = requiredPlan === "Pro" && options.length === 1;
  const [interval, setInterval] = useState<BillingIntervalChoice>("monthly");
  const [selectedPlan, setSelectedPlan] = useState<"core" | "pro">(
    requiredPlan === "Pro" ? "pro" : "core"
  );

  const selected = options.find((p) => p.id === selectedPlan) ?? options[0];

  return (
    <section
      className={cn(
        "mx-auto w-full rounded-2xl border border-border-warm bg-card shadow-sm",
        proOnly ? "max-w-4xl p-5 sm:p-8" : "max-w-5xl p-5 sm:p-8 lg:p-10",
        className
      )}
      aria-labelledby="upgrade-panel-title"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 sm:size-12 sm:rounded-2xl">
            <Lock className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 space-y-2">
            <h2
              id="upgrade-panel-title"
              className="text-xl font-semibold tracking-tight text-text-warm sm:text-2xl"
            >
              {title}
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-text-muted-warm sm:text-[0.95rem]">
              {description}
            </p>
          </div>
        </div>

        {isTenantAdmin && !checkoutHref ? (
          <IntervalToggle
            interval={interval}
            onChange={setInterval}
            className="sm:shrink-0"
          />
        ) : null}
      </div>

      {!isTenantAdmin ? (
        <p
          className="mt-8 rounded-xl border border-border-warm bg-muted/40 px-4 py-3 text-sm text-text-muted-warm"
          role="status"
        >
          This feature is locked on your workspace plan. Ask a tenant admin to upgrade.
        </p>
      ) : checkoutHref ? (
        <Link
          href={checkoutHref}
          className={cn(buttonVariants({ size: "lg" }), "mt-8 inline-flex")}
        >
          Upgrade to {requiredPlan}
        </Link>
      ) : (
        <div className="mt-7 space-y-6 sm:mt-8">
          {proOnly && selected ? (
            <ProOnlyPlanCard plan={selected} interval={interval} />
          ) : (
            <>
              <p className="text-sm font-medium text-text-warm">Choose a plan</p>
              <div
                role="radiogroup"
                aria-label="Plan"
                className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5"
              >
                {options.map((plan) => (
                  <SelectablePlanCard
                    key={plan.id}
                    plan={plan}
                    interval={interval}
                    active={selected?.id === plan.id}
                    requiredPlan={requiredPlan}
                    onSelect={() => setSelectedPlan(plan.id as "core" | "pro")}
                  />
                ))}
              </div>
            </>
          )}

          {selected ? (
            <div className="flex flex-col gap-4 border-t border-border-warm pt-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <p className="text-sm text-text-muted-warm">
                  30-day free trial · card required · cancel anytime before trial ends
                </p>
                {proOnly ? (
                  <p className="max-w-md text-xs leading-relaxed text-text-muted-warm">
                    Core does not include this Pro feature. Choose Pro to unlock it now.
                  </p>
                ) : null}
              </div>
              <Link
                href={buildCheckoutHref(selected.id as "core" | "pro", interval)}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "inline-flex w-full justify-center sm:w-auto sm:min-w-[13rem]"
                )}
              >
                Continue with {selected.name}
              </Link>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
