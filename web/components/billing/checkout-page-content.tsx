"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import {
  createBillingCheckoutWithAuth,
  formatTrialDisclaimer,
} from "@/lib/billing/billing-api";
import { consumeAuthHandoffFromHash } from "@/lib/auth-handoff";
import { setAuthSession } from "@/lib/auth-storage";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authFetch, status } = useAuth();

  const planParam = searchParams.get("plan");
  const intervalParam = searchParams.get("interval") ?? "monthly";
  const canceled = searchParams.get("canceled") === "1";

  const plan = planParam === "pro" ? "pro" : planParam === "core" ? "core" : null;
  const interval = intervalParam === "annual" ? "annual" : "monthly";

  const [error, setError] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const trialCopy = useMemo(() => formatTrialDisclaimer(30), []);

  useEffect(() => {
    const handoff = consumeAuthHandoffFromHash();
    if (handoff) {
      setAuthSession(handoff);
      window.location.replace(`${window.location.pathname}${window.location.search}`);
    }
  }, []);

  useEffect(() => {
    if (!plan || status === "loading" || canceled) {
      return;
    }

    if (status !== "authenticated") {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    async function startCheckout() {
      setStarting(true);
      setError(null);

      const checkout = await createBillingCheckoutWithAuth(authFetch, {
        plan: plan!,
        interval,
        successUrl: `${window.location.origin}/dashboard?billing=success`,
        cancelUrl: `${window.location.origin}/billing/checkout?plan=${plan}&interval=${interval}&canceled=1`,
      });

      if (cancelled) {
        return;
      }

      if (!checkout.ok) {
        setError(checkout.message);
        setStarting(false);
        return;
      }

      setDisclaimer(checkout.result.trialDisclaimer);
      window.location.href = checkout.result.checkoutUrl;
    }

    void startCheckout();

    return () => {
      cancelled = true;
    };
  }, [authFetch, canceled, interval, plan, router, status]);

  if (!plan) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <p className="text-sm text-stone">Choose a paid plan from pricing to continue.</p>
        <Link href="/pricing" className="mt-4 inline-block text-lagoon hover:text-ink">
          View pricing
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 p-8">
      <h1 className="text-xl font-semibold text-ink">Start your {plan} trial</h1>
      <p className="text-sm text-stone">{disclaimer ?? trialCopy}</p>
      <p className="text-sm text-stone">
        Billing interval: <span className="font-medium text-ink">{interval}</span>
      </p>
      {canceled ? (
        <p role="status" className="text-sm text-stone">
          Checkout was canceled. You can try again when ready.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        <p className="text-sm text-stone">
          {starting ? "Redirecting to Stripe Checkout…" : "Preparing checkout…"}
        </p>
      )}
      <Link href="/dashboard" className="inline-block text-sm text-lagoon hover:text-ink">
        Skip for now — open Basic dashboard
      </Link>
    </div>
  );
}

export function CheckoutPageContent() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-stone">Loading checkout…</p>}>
      <CheckoutContent />
    </Suspense>
  );
}
