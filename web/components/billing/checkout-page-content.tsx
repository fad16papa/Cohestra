"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  createBillingCheckoutWithAuth,
  fetchBillingSummaryWithAuth,
  type BillingSummary,
} from "@/lib/billing/billing-api";
import { cancelScheduledPlanChangeWithAuth } from "@/lib/billing/billing-details-api";
import {
  extractPaddleTransactionId,
  openPaddleCheckoutOverlay,
} from "@/lib/billing/paddle-checkout";
import {
  checkoutActionLabel,
  checkoutIntroCopy,
  checkoutPriceCaption,
  hasActivePaidSubscription,
  isDeferredPlanChange,
  isPaidPlanDowngrade,
  isBillingIntervalDowngrade,
  isSamePlanAndInterval,
  matchesScheduledPlanChange,
  normalizeBillingInterval,
  normalizePlanId,
  type BillingIntervalId,
  type PaidPlanId,
} from "@/lib/billing/checkout-validation";
import { getDowngradeLimitWarnings } from "@/lib/billing/downgrade-limit-warnings";
import { exchangeAuthHandoff } from "@/lib/auth-handoff";
import { setAuthSession } from "@/lib/auth-storage";
import { MARKETING_PLANS } from "@/lib/marketing/pricing-plans";
import { cn } from "@/lib/utils";

function priceFor(planId: PaidPlanId, interval: BillingIntervalId): string {
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
  const { shell, loading: shellLoading } = useTenantShell();

  const planParam = searchParams.get("plan");
  const intervalParam = searchParams.get("interval") ?? "monthly";
  const canceled = searchParams.get("canceled") === "1";
  const autoStart = searchParams.get("start") === "1";

  const initialPlan: PaidPlanId | null =
    planParam === "pro" ? "pro" : planParam === "core" ? "core" : null;
  const initialInterval: BillingIntervalId =
    intervalParam === "annual" ? "annual" : "monthly";

  const [plan, setPlan] = useState<PaidPlanId | null>(initialPlan);
  const [interval, setInterval] = useState<BillingIntervalId>(initialInterval);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(autoStart && !canceled);
  const [undoingScheduledChange, setUndoingScheduledChange] = useState(false);
  const [deferredConfirmOpen, setDeferredConfirmOpen] = useState(false);
  const [handoffPending, setHandoffPending] = useState(
    () => (searchParams.get("handoff")?.trim().length ?? 0) > 0
  );
  const [handoffFailed, setHandoffFailed] = useState(false);

  const planOptions = MARKETING_PLANS.filter((p) => p.id === "core" || p.id === "pro");

  useEffect(() => {
    const handoffCode = searchParams.get("handoff")?.trim();
    if (!handoffCode) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const session = await exchangeAuthHandoff(handoffCode);
      if (cancelled) {
        return;
      }

      if (!session) {
        setHandoffPending(false);
        setHandoffFailed(true);
        setError("Could not complete sign-in. Try signing in again.");
        const url = new URL(window.location.href);
        url.searchParams.delete("handoff");
        window.history.replaceState(null, "", `${url.pathname}${url.search}`);
        return;
      }

      setAuthSession(session);
      const url = new URL(window.location.href);
      url.searchParams.delete("handoff");
      window.location.replace(`${url.pathname}${url.search}`);
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    setPlan(initialPlan);
    setInterval(initialInterval);
  }, [initialInterval, initialPlan]);

  useEffect(() => {
    if (status !== "authenticated") {
      setBillingLoading(false);
      return;
    }

    let cancelled = false;

    void fetchBillingSummaryWithAuth(authFetch)
      .then((summary) => {
        if (!cancelled) {
          setBillingSummary(summary);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBillingSummary(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBillingLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, status]);

  async function startCheckout(selectedPlan: PaidPlanId, selectedInterval: BillingIntervalId) {
    if (billingSummary) {
      if (
        isSamePlanAndInterval(
          billingSummary.plan,
          billingSummary.billingInterval,
          selectedPlan,
          selectedInterval
        )
      ) {
        setError("Your workspace is already on the selected plan and billing interval.");
        return;
      }

      if (
        billingSummary.scheduledPlan
        && billingSummary.scheduledPlan !== "Basic"
        && billingSummary.scheduledPlanEffectiveAt
        && !matchesScheduledPlanChange(
          billingSummary.scheduledPlan,
          billingSummary.scheduledBillingInterval,
          selectedPlan,
          selectedInterval
        )
      ) {
        setError(
          "A plan change is already scheduled. Undo it below or in Settings → Billing before choosing a different plan."
        );
        return;
      }
    }

    const isDeferred =
      billingSummary !== null
      && isDeferredPlanChange(
        billingSummary.plan,
        billingSummary.billingInterval,
        selectedPlan,
        selectedInterval
      );
    if (isDeferred && billingLoading) {
      setError("Still loading billing details. Try again in a moment.");
      return;
    }

    if (isDeferred && shellLoading && !billingSummary?.usage) {
      setError("Still loading workspace usage. Try again in a moment.");
      return;
    }

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

    if (checkout.result.warnings.length > 0) {
      try {
        sessionStorage.setItem(
          "billing_downgrade_warnings",
          JSON.stringify(checkout.result.warnings)
        );
      } catch {
        // Ignore storage failures; checkout still proceeds.
      }
    }

    if (checkout.result.completedInApp) {
      window.location.href = checkout.result.checkoutUrl;
      return;
    }

    const clientToken = billingSummary?.clientToken;
    const transactionId = extractPaddleTransactionId(checkout.result.checkoutUrl);
    if (clientToken && transactionId) {
      try {
        await openPaddleCheckoutOverlay({
          clientToken,
          transactionId,
          successUrl: `${window.location.origin}/dashboard?billing=success&session_id=${transactionId}`,
          onClosed: () => setStarting(false),
        });
        return;
      } catch {
        // Fall through to hosted checkout redirect.
      }
    }

    window.location.href = checkout.result.checkoutUrl;
  }

  useEffect(() => {
    if (!autoStart || !plan || status === "loading" || canceled || handoffPending || handoffFailed) {
      return;
    }

    if (status !== "authenticated") {
      router.replace("/login");
      return;
    }

    if (billingLoading) {
      return;
    }

    const wouldDefer =
      billingSummary !== null
      && isDeferredPlanChange(
        billingSummary.plan,
        billingSummary.billingInterval,
        plan,
        interval
      );
    if (wouldDefer) {
      setStarting(false);
      return;
    }

    if (
      billingSummary
      && isSamePlanAndInterval(
        billingSummary.plan,
        billingSummary.billingInterval,
        plan,
        interval
      )
    ) {
      setStarting(false);
      setError("Your workspace is already on the selected plan and billing interval.");
      return;
    }

    void startCheckout(plan, interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot auto start from query
  }, [
    autoStart,
    billingLoading,
    billingSummary,
    canceled,
    handoffFailed,
    handoffPending,
    interval,
    plan,
    router,
    status,
  ]);

  if (handoffPending || status === "loading" || (billingLoading && status === "authenticated")) {
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

  const effectivePlan =
    plan ?? normalizePlanId(billingSummary?.plan ?? "") ?? ("core" as PaidPlanId);
  const effectiveMeta = MARKETING_PLANS.find((p) => p.id === effectivePlan) ?? planOptions[0];
  const priceLabel = priceFor(effectivePlan, interval);
  const currentPlan = billingSummary?.plan ?? "Basic";
  const billingStatus = billingSummary?.billingStatus ?? "Free";
  const isDeferredSelection =
    billingSummary !== null
    && isDeferredPlanChange(currentPlan, billingSummary.billingInterval, effectivePlan, interval);
  const isTierDowngradeSelection =
    billingSummary !== null && isPaidPlanDowngrade(currentPlan, effectivePlan);
  const isIntervalDowngradeSelection =
    billingSummary !== null
    && normalizePlanId(currentPlan) === effectivePlan
    && isBillingIntervalDowngrade(billingSummary.billingInterval, interval);
  const isCombinedTierAndIntervalDowngrade =
    isTierDowngradeSelection && isIntervalDowngradeSelection;
  const downgradeLimitWarnings = isTierDowngradeSelection
    ? getDowngradeLimitWarnings(shell, effectivePlan, {
        usage: billingSummary?.usage,
        coreLimits: billingSummary?.coreLimits,
        proLimits: billingSummary?.proLimits,
      })
    : [];
  const hasScheduledPlanChange =
    billingSummary?.scheduledPlan
    && billingSummary.scheduledPlan !== "Basic"
    && billingSummary.scheduledPlanEffectiveAt;
  const matchesExistingSchedule =
    billingSummary?.scheduledPlan
    && matchesScheduledPlanChange(
      billingSummary.scheduledPlan,
      billingSummary.scheduledBillingInterval,
      effectivePlan,
      interval
    );
  const isSameSelection =
    billingSummary !== null
    && isSamePlanAndInterval(currentPlan, billingSummary.billingInterval, effectivePlan, interval);
  const actionLabel = billingSummary
    ? checkoutActionLabel({
        billingStatus,
        currentPlan,
        hasConsumedTrial: billingSummary.hasConsumedTrial,
        targetPlan: effectivePlan,
        targetInterval: interval,
        currentInterval: billingSummary.billingInterval,
      })
    : `Start ${effectiveMeta?.name ?? "plan"} trial`;
  const introCopy = billingSummary
    ? checkoutIntroCopy({
        billingStatus,
        currentPlan,
        trialEndsAt: billingSummary.trialEndsAt,
        hasConsumedTrial: billingSummary.hasConsumedTrial,
        trialPeriodDays: billingSummary.trialPeriodDays,
      })
    : null;
  const priceCaption = billingSummary
    ? checkoutPriceCaption({
        billingStatus,
        trialEndsAt: billingSummary.trialEndsAt,
        hasConsumedTrial: billingSummary.hasConsumedTrial,
      })
    : "After trial";
  const submitDisabled =
    starting
    || isSameSelection
    || Boolean(matchesExistingSchedule)
    || (Boolean(hasScheduledPlanChange) && !matchesExistingSchedule)
    || (isDeferredSelection && shellLoading && !billingSummary?.usage);
  const isPaidTenant = hasActivePaidSubscription(billingStatus);

  function requestPlanChange() {
    if (isDeferredSelection) {
      setDeferredConfirmOpen(true);
      return;
    }

    void startCheckout(effectivePlan, interval);
  }

  // Plan + interval already chosen on the upgrade gate — go straight to checkout (upgrades only).
  if (autoStart && !canceled && plan && !isDeferredSelection) {
    const meta = MARKETING_PLANS.find((p) => p.id === plan);
    const adjustHref = `/billing/checkout?plan=${plan}&interval=${interval}`;
    const alreadyOnPlan = error?.includes("already on the selected plan");

    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-md flex-col items-center justify-center gap-5 p-8 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-text-warm">
            {error
              ? alreadyOnPlan
                ? "You're already on this plan"
                : "Could not start checkout"
              : isDeferredSelection
                ? `Scheduling plan change`
                : `Starting ${meta?.name ?? "plan"} ${billingSummary?.hasConsumedTrial ? "subscription" : "trial"}`}
          </h1>
          <p className="text-sm leading-relaxed text-text-muted-warm">
            {error
              ? alreadyOnPlan
                ? "Pick a different plan or billing interval, or go back to billing settings."
                : "Something went wrong starting your plan. You can try again or pick a different plan."
              : isDeferredSelection
                ? "Your current plan stays active until the end of this billing period."
                : `${priceFor(plan, interval)} ${billingSummary?.hasConsumedTrial ? "starting today" : "after trial"} · uses your saved card when on file · cancel anytime before trial ends.`}
          </p>
        </div>

        {error ? (
          <div className="flex w-full flex-col gap-3">
            {!alreadyOnPlan ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            {!alreadyOnPlan ? (
              <Button
                type="button"
                size="lg"
                disabled={starting}
                onClick={() => void startCheckout(plan, interval)}
              >
                {starting ? "Retrying…" : "Try again"}
              </Button>
            ) : (
              <Link
                href="/settings/billing"
                className={cn(buttonVariants({ size: "lg" }), "inline-flex justify-center")}
              >
                Back to billing
              </Link>
            )}
            <Link
              href={adjustHref}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "inline-flex justify-center")}
            >
              Choose a different plan
            </Link>
          </div>
        ) : (
          <p className="text-sm text-text-muted-warm" role="status">
            Processing your plan change…
          </p>
        )}
      </div>
    );
  }

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
          {introCopy}
        </p>
      </div>

      {billingSummary && isPaidTenant ? (
        <p
          role="status"
          className="rounded-xl border border-border-warm bg-muted/30 px-4 py-3 text-sm text-text-warm"
        >
          Current plan: <span className="font-medium">{currentPlan}</span>
          {" · "}
          Status: <span className="font-medium">{billingStatus}</span>
          {billingSummary.billingInterval ? (
            <>
              {" · "}
              Billing:{" "}
              <span className="font-medium">
                {normalizeBillingInterval(billingSummary.billingInterval) === "annual"
                  ? "Yearly"
                  : "Monthly"}
              </span>
            </>
          ) : null}
        </p>
      ) : null}

      {canceled ? (
        <p
          role="status"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-text-warm"
        >
          Checkout was canceled. Adjust your plan or billing interval and try again.
        </p>
      ) : null}

      {hasScheduledPlanChange ? (
        <div
          role="status"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-text-warm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>
              A switch to {billingSummary?.scheduledPlan} is already scheduled for{" "}
              {new Date(billingSummary!.scheduledPlanEffectiveAt!).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              . Undo it here to choose a different plan, or manage it in Settings → Billing.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={undoingScheduledChange || starting}
              onClick={() => {
                setUndoingScheduledChange(true);
                setError(null);
                void cancelScheduledPlanChangeWithAuth(authFetch)
                  .then(() => fetchBillingSummaryWithAuth(authFetch))
                  .then((summary) => {
                    setBillingSummary(summary);
                  })
                  .catch((err) => {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Could not cancel the scheduled plan change."
                    );
                  })
                  .finally(() => setUndoingScheduledChange(false));
              }}
            >
              {undoingScheduledChange ? "Updating…" : "Undo scheduled change"}
            </Button>
          </div>
        </div>
      ) : null}

      {isDeferredSelection ? (
        <div
          role="status"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-text-warm"
        >
          <p>
            {isCombinedTierAndIntervalDowngrade
              ? `This change takes effect at the end of your current billing period. You will switch to ${effectiveMeta?.name ?? "the selected plan"} on monthly billing. You keep ${currentPlan} access until then.`
              : isTierDowngradeSelection
                ? `This change takes effect at the end of your current billing period. You keep ${currentPlan} access until then.`
                : "Switching from yearly to monthly billing takes effect at the end of your current billing period. You keep your current plan and yearly rate until then."}
          </p>
          {downgradeLimitWarnings.length > 0 ? (
            <div className="mt-3 space-y-2">
              <p className="font-medium text-amber-900 dark:text-amber-100">
                Your current usage exceeds {effectiveMeta?.name ?? "the selected plan"} limits:
              </p>
              <ul className="list-disc space-y-1 pl-5 text-amber-900/90 dark:text-amber-100/90">
                {downgradeLimitWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
              <p>
                Reduce usage before the switch date, or your workspace may become read-only when
                the lower plan takes effect.
              </p>
            </div>
          ) : isTierDowngradeSelection ? (
            <p className="mt-2">
              Your current usage fits within {effectiveMeta?.name ?? "the selected plan"} limits.
            </p>
          ) : null}
        </div>
      ) : isPaidTenant && !isSameSelection ? (
        <p
          role="status"
          className="rounded-xl border border-border-warm bg-muted/30 px-4 py-3 text-sm text-text-muted-warm"
        >
          This change applies immediately. Any price difference is prorated on your next invoice.
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
            const cardPrice = priceFor(meta.id as PaidPlanId, interval);
            const isCurrentPlan =
              billingSummary !== null
              && isSamePlanAndInterval(
                currentPlan,
                billingSummary.billingInterval,
                meta.id as PaidPlanId,
                interval
              );

            return (
              <button
                key={meta.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={starting}
                onClick={() => setPlan(meta.id as PaidPlanId)}
                className={cn(
                  "flex h-full flex-col rounded-2xl border p-5 text-left transition-colors sm:p-6",
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border-warm hover:border-primary/40",
                  isCurrentPlan && !active && "opacity-80"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-text-warm">{meta.name}</p>
                    <p className="mt-1 text-sm text-text-muted-warm">{meta.headline}</p>
                    {isCurrentPlan ? (
                      <p className="mt-2 text-xs font-medium text-primary">Current plan</p>
                    ) : null}
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
            <p className="text-sm text-text-muted-warm">{priceCaption}</p>
            <p className="mt-1 text-lg font-semibold text-text-warm">{priceLabel}</p>
            <p className="mt-1 text-xs text-text-muted-warm">
              Billed in USD. Checkout may show a local currency estimate based on your location.
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            className="w-full sm:w-auto sm:min-w-[14rem]"
            disabled={submitDisabled}
            onClick={requestPlanChange}
          >
            {starting ? "Processing…" : actionLabel}
          </Button>
        </div>

        {matchesExistingSchedule ? (
          <p role="status" className="text-sm text-text-muted-warm">
            This plan change is already scheduled for{" "}
            {new Date(billingSummary!.scheduledPlanEffectiveAt!).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            . Undo it above to pick a different option.
          </p>
        ) : null}

        {isSameSelection ? (
          <p role="status" className="text-sm text-text-muted-warm">
            You are already on this plan and billing interval. Choose a different option to continue.
          </p>
        ) : null}

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
        <Link href={isPaidTenant ? "/settings/billing" : "/dashboard"} className="text-text-muted-warm hover:text-text-warm">
          {isPaidTenant ? "Keep current plan" : "Stay on Basic for now"}
        </Link>
      </div>

      <AlertDialog open={deferredConfirmOpen} onOpenChange={setDeferredConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Schedule this plan change?</AlertDialogTitle>
            <AlertDialogDescription>
              {isCombinedTierAndIntervalDowngrade
                ? `Your workspace will switch to ${effectiveMeta?.name ?? "the selected plan"} on monthly billing at the end of your current billing period. You keep ${currentPlan} access until then.`
                : isTierDowngradeSelection
                  ? `Your workspace will switch to ${effectiveMeta?.name ?? "the selected plan"} at the end of your current billing period. You keep ${currentPlan} access until then.`
                  : "Your billing interval will switch to monthly at the end of your current billing period. You keep your current plan and yearly rate until then."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={starting}>Keep current plan</AlertDialogCancel>
            <AlertDialogAction
              disabled={starting}
              onClick={() => {
                setDeferredConfirmOpen(false);
                void startCheckout(effectivePlan, interval);
              }}
            >
              {starting ? "Processing…" : "Schedule change"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
