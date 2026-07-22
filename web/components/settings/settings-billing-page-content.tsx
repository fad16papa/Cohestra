"use client";

import Link from "next/link";

import { useAuth } from "@/components/auth/auth-provider";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { fetchBillingSummaryWithAuth } from "@/lib/billing/billing-api";
import { marketingAtelierButtonClass } from "@/components/marketing/marketing-shell";
import { useEffect, useState } from "react";

export function SettingsBillingPageContent() {
  const { authFetch } = useAuth();
  const { shell, refreshShell } = useTenantShell();
  const [stripeConfigured, setStripeConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    void fetchBillingSummaryWithAuth(authFetch)
      .then((summary) => setStripeConfigured(summary.stripeConfigured))
      .catch(() => setStripeConfigured(false));
  }, [authFetch]);

  if (!shell?.isTenantAdmin) {
    return (
      <p className="text-sm text-stone">
        Billing settings are available to tenant admins only.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Billing</h1>
        <p className="mt-1 text-sm text-stone">
          Plan: <span className="font-medium text-ink">{shell.plan}</span>
          {" · "}
          Status: <span className="font-medium text-ink">{shell.billingStatus}</span>
        </p>
        {shell.trialEndsAt ? (
          <p className="mt-2 text-sm text-stone">
            Trial ends {new Date(shell.trialEndsAt).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        ) : null}
      </div>

      {shell.plan === "Basic" ? (
        <div className="space-y-3 rounded-xl border border-line bg-paper-warm p-5">
          <p className="text-sm text-stone">
            Upgrade to Core or Pro for a public site page, team seats, and richer reports.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/billing/checkout?plan=core&interval=monthly" className={marketingAtelierButtonClass("lagoon")}>
              Start Core trial
            </Link>
            <Link href="/billing/checkout?plan=pro&interval=monthly" className={marketingAtelierButtonClass("ghost")}>
              Start Pro trial
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-paper-warm p-5 text-sm text-stone">
          {stripeConfigured
            ? "Stripe Customer Portal for payment method and cancellation ships in the next release. Plan changes sync automatically from Stripe webhooks."
            : "Stripe is not configured in this environment."}
          <div className="mt-4">
            <button
              type="button"
              className={marketingAtelierButtonClass("ghost")}
              onClick={() => void refreshShell()}
            >
              Refresh billing status
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
