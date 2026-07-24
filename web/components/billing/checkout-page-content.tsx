"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  createBillingCheckoutWithAuth,
  formatTrialDisclaimer,
} from "@/lib/billing/billing-api";
import { consumeAuthHandoffFromHash } from "@/lib/auth-handoff";
import { setAuthSession } from "@/lib/auth-storage";
import { MARKETING_PLANS } from "@/lib/marketing/pricing-plans";
import { cn } from "@/lib/utils";

type PlanId = "core" | "pro";
type IntervalId = "monthly" | "annual";

function priceFor(planId: PlanId, interval: IntervalId): string {
  const meta = MARKETING_PLANS.find((p) => p.id === planId);
  if (!meta) {
    return "";
  }

  if (interval === "annual") {
    return meta.annualMonthlyEquivalent ?? meta.annualPrice ?? "";
  }

  if (!meta.monthlyPrice || meta.monthlyPrice === "Free" || meta.monthlyPrice === "Custom") {
    return meta.monthlyPrice ?? "";
  }

  return `${meta.monthlyPrice} / mo`;
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authFetch, status } = useAuth();

  const planParam = searchParams.get("plan");
  const intervalParam = searchParams.get("interval") ?? "monthly";
  const canceled = searchParams.get("canceled") === "1";
  const autoStart = searchParams.get("start") === "1";

  const initialPlan: PlanId | null =
    planParam === "pro" ? "pro" : planParam === "core" ? "core" : null;
  const initialInterval: IntervalId =
    intervalParam === "annual" ? "annual" : "monthly";

  const [plan, setPlan] = useState<PlanId | null>(initialPlan);
  const [interval, setInterval] = useState<IntervalId>(initialInterval);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(autoStart && !canceled);

  const trialCopy = useMemo(() => formatTrialDisclaimer(30), []);
  const planOptions = MARKETING_PLANS.filter((p) => p.id === "core" || p.id === "pro");

  useEffect(() => {
    const handoff = consumeAuthHandoffFromHash();
    if (handoff) {
      setAuthSession(handoff);
      window.location.replace(`${window.location.pathname}${window.location.search}`);
    }
  }, []);

  useEffect(() => {
    setPlan(initialPlan);
    setInterval(initialInterval);
  }, [initialInterval, initialPlan]);

  async function startCheckout(selectedPlan: PlanId, selectedInterval: IntervalId) {
    setStarting(true);
    setError(null);

    const checkout = await createBillingCheckoutWithAuth(authFetch, {
      plan: selectedPlan,
      interval: selectedInterval,
      successUrl: `${window.location.origin}/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/billing/checkout?plan=${selectedPlan}&interval=${selectedInterval}&canceled=1`,
    });

    if (!checkout.ok) {
      setError(checkout.message);
      setStarting(false);
      return;
    }

    window.location.href = checkout.result.checkoutUrl;
  }

  useEffect(() => {
    if (!autoStart || !plan || status === "loading" || canceled) {
      return;
    }

    if (status !== "authenticated") {
      router.replace("/login");
      return;
    }

    void startCheckout(plan, interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot auto start from query
  }, [autoStart, canceled, interval, plan, router, status]);

  if (status === "loading") {
    return <p className="p-8 text-sm text-text-muted-warm">Loading checkout…</p>;
  }

  if (status !== "authenticated") {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-8">
        <p className="text-sm text-text-muted-warm">Sign in to continue to checkout.</p>
        <Link href="/login" className={cn(buttonVariants(), "inline-flex")}>
          Sign in
        </Link>
      </div>
    );
  }

  // Plan + interval already chosen on the upgrade gate — go straight to Stripe.
  if (autoStart && !canceled && plan) {
    const meta = MARKETING_PLANS.find((p) => p.id === plan);
    const adjustHref = `/billing/checkout?plan=${plan}&interval=${interval}`;

    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-md flex-col items-center justify-center gap-5 p-8 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-text-warm">
            {error ? "Could not start checkout" : `Starting ${meta?.name ?? "plan"} trial`}
          </h1>
          <p className="text-sm leading-relaxed text-text-muted-warm">
            {error
              ? "Something went wrong opening Stripe. You can try again or pick a different plan."
              : `${priceFor(plan, interval)} after trial · card required · cancel anytime before trial ends.`}
          </p>
        </div>

        {error ? (
          <div className="flex w-full flex-col gap-3">
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
            <Button
              type="button"
              size="lg"
              disabled={starting}
              onClick={() => void startCheckout(plan, interval)}
            >
              {starting ? "Retrying…" : "Try again"}
            </Button>
            <Link
              href={adjustHref}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "inline-flex justify-center")}
            >
              Choose a different plan
            </Link>
          </div>
        ) : (
          <p className="text-sm text-text-muted-warm" role="status">
            Redirecting to Stripe…
          </p>
        )}
      </div>
    );
  }

  const effectivePlan = plan ?? "core";
  const effectiveMeta = MARKETING_PLANS.find((p) => p.id === effectivePlan) ?? planOptions[0];
  const priceLabel = priceFor(effectivePlan, interval);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <Link
          href="/settings/billing"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted-warm hover:text-text-warm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to billing
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-text-warm sm:text-3xl">
          Confirm your plan
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted-warm sm:text-base">
          {trialCopy}
        </p>
      </div>

      {canceled ? (
        <p
          role="status"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-text-warm"
        >
          Checkout was canceled. Adjust your plan or billing interval and try again.
        </p>
      ) : null}

      <section className="space-y-6 rounded-2xl border border-border-warm bg-card p-5 shadow-sm sm:p-8 lg:p-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-text-warm">Billing interval</p>
          <div
            role="radiogroup"
            aria-label="Billing interval"
            className="inline-flex w-full max-w-sm rounded-xl border border-border-warm bg-muted/40 p-1 sm:w-auto"
          >
            {(["monthly", "annual"] as const).map((value) => {
              const active = interval === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={starting}
                  onClick={() => setInterval(value)}
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
        </div>

        <div
          role="radiogroup"
          aria-label="Plan"
          className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5"
        >
          {planOptions.map((meta) => {
            const active = effectivePlan === meta.id;
            const cardPrice = priceFor(meta.id as PlanId, interval);

            return (
              <button
                key={meta.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={starting}
                onClick={() => setPlan(meta.id as PlanId)}
                className={cn(
                  "flex h-full flex-col rounded-2xl border p-5 text-left transition-colors sm:p-6",
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border-warm hover:border-primary/40"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-text-warm">{meta.name}</p>
                    <p className="mt-1 text-sm text-text-muted-warm">{meta.headline}</p>
                  </div>
                  {active ? <Check className="mt-1 size-5 shrink-0 text-primary" aria-hidden /> : null}
                </div>
                <p className="mt-4 text-2xl font-semibold text-text-warm">{cardPrice}</p>
                {interval === "annual" && meta.annualPrice ? (
                  <p className="mt-1 text-sm text-text-muted-warm">{meta.annualPrice}</p>
                ) : null}
                <ul className="mt-5 flex-1 space-y-2.5 text-sm leading-relaxed text-text-muted-warm">
                  {meta.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-4 border-t border-border-warm pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-text-muted-warm">After trial</p>
            <p className="mt-1 text-lg font-semibold text-text-warm">{priceLabel}</p>
            <p className="mt-1 text-xs text-text-muted-warm">
              Billed in USD. Stripe may show a local currency estimate at checkout.
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            className="w-full sm:w-auto sm:min-w-[14rem]"
            disabled={starting}
            onClick={() => void startCheckout(effectivePlan, interval)}
          >
            {starting ? "Redirecting to Stripe…" : `Start ${effectiveMeta?.name ?? "plan"} trial`}
          </Button>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href="/pricing" className="text-text-muted-warm hover:text-text-warm">
          Compare plans
        </Link>
        <Link href="/dashboard" className="text-text-muted-warm hover:text-text-warm">
          Stay on Basic for now
        </Link>
      </div>
    </div>
  );
}

export function CheckoutPageContent() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-text-muted-warm">Loading checkout…</p>}>
      <CheckoutContent />
    </Suspense>
  );
}
