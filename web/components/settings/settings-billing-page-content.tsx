"use client";

import Link from "next/link";

import { useAuth } from "@/components/auth/auth-provider";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { createBillingPortalSession, fetchBillingSummaryWithAuth, syncBillingFromStripeWithAuth } from "@/lib/billing/billing-api";
import { marketingAtelierButtonClass } from "@/components/marketing/marketing-shell";
import { useEffect, useRef, useState } from "react";

export function SettingsBillingPageContent() {
  const { authFetch } = useAuth();
  const { shell, refreshShell } = useTenantShell();
  const [stripeConfigured, setStripeConfigured] = useState<boolean | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
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
            <button
              type="button"
              className={marketingAtelierButtonClass("ghost")}
              onClick={() => {
                void syncBillingFromStripeWithAuth(authFetch)
                  .then(() => refreshShell())
                  .catch(() => refreshShell());
              }}
            >
              Refresh billing status
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-paper-warm p-5 text-sm text-stone">
          {stripeConfigured ? (
            <div className="space-y-4">
              <p>
                Manage payment method, invoices, and plan changes in Stripe Customer Portal.
                Cancel and downgrades apply at period end.
              </p>
              <button
                type="button"
                className={marketingAtelierButtonClass("lagoon")}
                disabled={portalLoading}
                onClick={() => {
                  setPortalLoading(true);
                  setPortalError(null);
                  void createBillingPortalSession(authFetch, `${window.location.origin}/settings/billing`)
                    .then((url) => {
                      window.location.href = url;
                    })
                    .catch((err) => {
                      setPortalError(err instanceof Error ? err.message : "Could not open portal.");
                      setPortalLoading(false);
                    });
                }}
              >
                {portalLoading ? "Opening…" : "Manage billing"}
              </button>
              {portalError ? <p className="text-destructive">{portalError}</p> : null}
            </div>
          ) : (
            "Stripe is not configured in this environment."
          )}
          <div className="mt-4">
            <button
              type="button"
              className={marketingAtelierButtonClass("ghost")}
              onClick={() => {
                void syncBillingFromStripeWithAuth(authFetch)
                  .then(() => refreshShell())
                  .catch(() => refreshShell());
              }}
            >
              Refresh billing status
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
