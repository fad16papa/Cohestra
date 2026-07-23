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
  const [starting, setStarting] = useState(false);

  const trialCopy = useMemo(() => formatTrialDisclaimer(30), []);
  const planMeta = MARKETING_PLANS.find((p) => p.id === plan);

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

  if (!plan) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6 sm:p-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-warm">Choose a plan</h1>
          <p className="mt-2 text-sm text-text-muted-warm">
            Pick Core or Pro, then monthly or yearly billing. You get a 30-day free trial.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["core", "pro"] as const).map((id) => {
            const meta = MARKETING_PLANS.find((p) => p.id === id);
            if (!meta) {
              return null;
            }

            return (
              <button
                key={id}
                type="button"
                onClick={() => setPlan(id)}
                className="rounded-2xl border border-border-warm bg-card p-5 text-left transition-colors hover:border-primary/40"
              >
                <p className="font-semibold text-text-warm">{meta.name}</p>
                <p className="mt-1 text-sm text-text-muted-warm">{meta.headline}</p>
                <p className="mt-3 text-lg font-semibold text-text-warm">
                  {meta.monthlyPrice}
                  <span className="text-sm font-normal text-text-muted-warm">/mo</span>
                </p>
              </button>
            );
          })}
        </div>
        <Link href="/pricing" className="text-sm text-primary hover:underline">
          Compare all plans
        </Link>
      </div>
    );
  }

  const priceLabel =
    interval === "annual"
      ? planMeta?.annualMonthlyEquivalent ?? planMeta?.annualPrice
      : `${planMeta?.monthlyPrice ?? ""}/mo`;

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6 sm:p-8">
      <div>
        <Link
          href="/settings/billing"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted-warm hover:text-text-warm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to billing
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-text-warm">
          Start your {planMeta?.name ?? plan} trial
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-text-muted-warm">{trialCopy}</p>
      </div>

      {canceled ? (
        <p
          role="status"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-text-warm"
        >
          Checkout was canceled. Adjust your plan or billing interval and try again.
        </p>
      ) : null}

      <section className="space-y-4 rounded-2xl border border-border-warm bg-card p-5 sm:p-6">
        <div
          role="radiogroup"
          aria-label="Plan"
          className="grid gap-2 sm:grid-cols-2"
        >
          {(["core", "pro"] as const).map((id) => {
            const meta = MARKETING_PLANS.find((p) => p.id === id);
            if (!meta) {
              return null;
            }

            const active = plan === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={starting}
                onClick={() => setPlan(id)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors",
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border-warm hover:border-primary/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text-warm">{meta.name}</span>
                  {active ? <Check className="size-4 text-primary" aria-hidden /> : null}
                </div>
                <p className="mt-1 text-xs text-text-muted-warm">{meta.headline}</p>
              </button>
            );
          })}
        </div>

        <div
          role="radiogroup"
          aria-label="Billing interval"
          className="grid grid-cols-2 gap-2"
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
                  "rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/5 text-text-warm ring-1 ring-primary/30"
                    : "border-border-warm text-text-muted-warm hover:border-primary/40 hover:text-text-warm"
                )}
              >
                {value === "monthly" ? "Monthly" : "Yearly"}
                {value === "annual" ? (
                  <span className="mt-1 block text-xs font-normal text-primary">
                    Save ~17%
                  </span>
                ) : (
                  <span className="mt-1 block text-xs font-normal text-text-muted-warm">
                    Flexible
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="rounded-xl bg-muted/50 px-4 py-3">
          <p className="text-sm text-text-muted-warm">After trial</p>
          <p className="mt-1 text-lg font-semibold text-text-warm">{priceLabel}</p>
          {interval === "annual" && planMeta?.annualPrice ? (
            <p className="text-xs text-text-muted-warm">{planMeta.annualPrice}</p>
          ) : null}
          <p className="mt-2 text-xs text-text-muted-warm">
            Billed in USD. Stripe may show a local currency estimate at checkout.
          </p>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={starting}
          onClick={() => void startCheckout(plan, interval)}
        >
          {starting ? "Redirecting to Stripe…" : "Continue to Stripe Checkout"}
        </Button>
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
