"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Lock } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { MARKETING_PLANS } from "@/lib/marketing/pricing-plans";
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

function planOptionsFor(requiredPlan: UpgradeRequiredPlan) {
  const core = MARKETING_PLANS.find((p) => p.id === "core");
  const pro = MARKETING_PLANS.find((p) => p.id === "pro");
  if (requiredPlan === "Pro") {
    return pro ? [pro] : [];
  }

  return [core, pro].filter((p): p is NonNullable<typeof p> => p != null);
}

export function buildCheckoutHref(
  planId: "core" | "pro",
  interval: BillingIntervalChoice
): string {
  return `/billing/checkout?plan=${planId}&interval=${interval}`;
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
  const [interval, setInterval] = useState<BillingIntervalChoice>("monthly");
  const [selectedPlan, setSelectedPlan] = useState<"core" | "pro">(
    requiredPlan === "Pro" ? "pro" : "core"
  );

  const selected = options.find((p) => p.id === selectedPlan) ?? options[0];

  return (
    <section
      className={cn(
        "mx-auto w-full max-w-2xl rounded-2xl border border-border-warm bg-card p-6 shadow-sm sm:p-8",
        className
      )}
      aria-labelledby="upgrade-panel-title"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <Lock className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 space-y-1">
          <h2 id="upgrade-panel-title" className="text-lg font-semibold text-text-warm">
            {title}
          </h2>
          <p className="text-sm leading-relaxed text-text-muted-warm">{description}</p>
        </div>
      </div>

      {!isTenantAdmin ? (
        <p className="mt-6 rounded-xl border border-border-warm bg-muted/40 px-4 py-3 text-sm text-text-muted-warm" role="status">
          This feature is locked on your workspace plan. Ask a tenant admin to upgrade.
        </p>
      ) : checkoutHref ? (
        <Link
          href={checkoutHref}
          className={cn(buttonVariants({ size: "lg" }), "mt-6 inline-flex")}
        >
          Upgrade to {requiredPlan}
        </Link>
      ) : (
        <div className="mt-6 space-y-5">
          <div
            role="radiogroup"
            aria-label="Billing interval"
            className="inline-flex rounded-xl border border-border-warm bg-muted/40 p-1"
          >
            {(["monthly", "annual"] as const).map((value) => {
              const active = interval === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setInterval(value)}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
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

          <div
            role="radiogroup"
            aria-label="Plan"
            className={cn(
              "grid gap-3",
              options.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"
            )}
          >
            {options.map((plan) => {
              const active = selected?.id === plan.id;
              const price =
                interval === "annual"
                  ? plan.annualMonthlyEquivalent ?? plan.annualPrice
                  : `${plan.monthlyPrice}/mo`;

              return (
                <button
                  key={plan.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelectedPlan(plan.id as "core" | "pro")}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border-warm bg-background hover:border-primary/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-text-warm">{plan.name}</p>
                    {active ? (
                      <Check className="size-4 text-primary" aria-hidden />
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-text-muted-warm">{plan.headline}</p>
                  <p className="mt-3 text-base font-semibold text-text-warm">{price}</p>
                  {interval === "annual" && plan.annualPrice ? (
                    <p className="mt-0.5 text-xs text-text-muted-warm">{plan.annualPrice}</p>
                  ) : null}
                  <ul className="mt-3 space-y-1.5 text-xs text-text-muted-warm">
                    {plan.features.slice(0, 3).map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <span className="mt-1 size-1 shrink-0 rounded-full bg-primary" aria-hidden />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          {selected ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-text-muted-warm">
                30-day free trial · card required · cancel anytime before trial ends
              </p>
              <Link
                href={buildCheckoutHref(selected.id as "core" | "pro", interval)}
                className={cn(buttonVariants({ size: "lg" }), "inline-flex")}
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
