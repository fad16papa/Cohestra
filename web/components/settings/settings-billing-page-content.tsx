"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { buttonVariants } from "@/components/ui/button";
import {
  createBillingPortalSession,
  fetchBillingSummaryWithAuth,
  syncBillingFromStripeWithAuth,
} from "@/lib/billing/billing-api";
import { MARKETING_PLANS } from "@/lib/marketing/pricing-plans";
import { cn } from "@/lib/utils";

export function SettingsBillingPageContent() {
  const { authFetch } = useAuth();
  const { shell, refreshShell } = useTenantShell();
  const [stripeConfigured, setStripeConfigured] = useState<boolean | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const autoSyncedRef = useRef(false);

  useEffect(() => {
    void fetchBillingSummaryWithAuth(authFetch)
      .then((summary) => setStripeConfigured(summary.stripeConfigured))
      .catch(() => setStripeConfigured(false));
  }, [authFetch]);

  useEffect(() => {
    if (!shell?.isTenantAdmin || shell.plan !== "Basic" || autoSyncedRef.current) {
      return;
    }

    autoSyncedRef.current = true;
    void syncBillingFromStripeWithAuth(authFetch)
      .then(() => refreshShell())
      .catch(() => undefined);
  }, [authFetch, refreshShell, shell?.isTenantAdmin, shell?.plan]);

  if (!shell?.isTenantAdmin) {
    return (
      <p className="text-sm text-text-muted-warm">
        Billing settings are available to tenant admins only.
      </p>
    );
  }

  const core = MARKETING_PLANS.find((p) => p.id === "core");
  const pro = MARKETING_PLANS.find((p) => p.id === "pro");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-warm">Billing</h1>
        <p className="mt-1 text-sm text-text-muted-warm">
          Plan: <span className="font-medium text-text-warm">{shell.plan}</span>
          {" · "}
          Status: <span className="font-medium text-text-warm">{shell.billingStatus}</span>
        </p>
        {shell.trialEndsAt ? (
          <p className="mt-2 text-sm text-text-muted-warm">
            Trial ends{" "}
            {new Date(shell.trialEndsAt).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        ) : null}
      </div>

      {shell.plan === "Basic" ? (
        <section className="space-y-5 rounded-2xl border border-border-warm bg-card p-5 sm:p-6">
          <div>
            <h2 className="text-sm font-medium text-text-warm">Upgrade your workspace</h2>
            <p className="mt-1 text-sm text-text-muted-warm">
              Choose Core or Pro, then pick monthly or yearly on the next step. Both include a
              30-day free trial.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[core, pro].filter(Boolean).map((plan) => (
              <div
                key={plan!.id}
                className="rounded-xl border border-border-warm bg-background p-4"
              >
                <p className="font-semibold text-text-warm">{plan!.name}</p>
                <p className="mt-1 text-xs text-text-muted-warm">{plan!.headline}</p>
                <p className="mt-3 text-base font-semibold text-text-warm">
                  {plan!.monthlyPrice}
                  <span className="text-sm font-normal text-text-muted-warm">/mo</span>
                </p>
                {plan!.annualMonthlyEquivalent ? (
                  <p className="text-xs text-text-muted-warm">
                    or {plan!.annualMonthlyEquivalent}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-col gap-2">
                  <Link
                    href={`/billing/checkout?plan=${plan!.id}&interval=monthly`}
                    className={cn(buttonVariants({ size: "sm" }), "justify-center")}
                  >
                    Monthly trial
                  </Link>
                  <Link
                    href={`/billing/checkout?plan=${plan!.id}&interval=annual`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "justify-center"
                    )}
                  >
                    Yearly trial
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-text-muted-warm")}
            disabled={syncing}
            onClick={() => {
              setSyncing(true);
              void syncBillingFromStripeWithAuth(authFetch)
                .then(() => refreshShell())
                .catch(() => refreshShell())
                .finally(() => setSyncing(false));
            }}
          >
            {syncing ? "Refreshing…" : "Refresh billing status"}
          </button>
        </section>
      ) : (
        <section className="space-y-4 rounded-2xl border border-border-warm bg-card p-5 sm:p-6 text-sm text-text-muted-warm">
          {stripeConfigured ? (
            <div className="space-y-4">
              <p>
                Manage payment method, invoices, and plan changes in Stripe Customer Portal.
                Cancel and downgrades apply at period end.
              </p>
              <button
                type="button"
                className={cn(buttonVariants(), "inline-flex")}
                disabled={portalLoading}
                onClick={() => {
                  setPortalLoading(true);
                  setPortalError(null);
                  void createBillingPortalSession(
                    authFetch,
                    `${window.location.origin}/settings/billing`
                  )
                    .then((url) => {
                      window.location.href = url;
                    })
                    .catch((err) => {
                      setPortalError(
                        err instanceof Error ? err.message : "Could not open portal."
                      );
                      setPortalLoading(false);
                    });
                }}
              >
                {portalLoading ? "Opening…" : "Manage billing"}
              </button>
              {portalError ? <p className="text-destructive">{portalError}</p> : null}
            </div>
          ) : (
            <p>Stripe is not configured in this environment.</p>
          )}
          <button
            type="button"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            disabled={syncing}
            onClick={() => {
              setSyncing(true);
              void syncBillingFromStripeWithAuth(authFetch)
                .then(() => refreshShell())
                .catch(() => refreshShell())
                .finally(() => setSyncing(false));
            }}
          >
            {syncing ? "Refreshing…" : "Refresh billing status"}
          </button>
        </section>
      )}
    </div>
  );
}
