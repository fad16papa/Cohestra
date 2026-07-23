"use client";

import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { UpgradePanel } from "@/components/shell/upgrade-panel";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { buttonVariants } from "@/components/ui/button";
import {
  createBillingPortalSession,
  fetchBillingSummaryWithAuth,
  syncBillingFromStripeWithAuth,
} from "@/lib/billing/billing-api";
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

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-warm sm:text-2xl">Billing</h1>
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
        <div className="space-y-4">
          <UpgradePanel
            title="Upgrade your workspace"
            description="Compare Core and Pro, choose monthly or yearly billing, then continue to Stripe for a 30-day free trial."
            requiredPlan="Core"
            isTenantAdmin
          />
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
        </div>
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
