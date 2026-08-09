"use client";

import { useEffect, useRef } from "react";

import { InAppBillingPanel } from "@/components/billing/in-app-billing-panel";
import { useAuth } from "@/components/auth/auth-provider";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { syncBillingFromStripeWithAuth } from "@/lib/billing/billing-api";

export function SettingsBillingPageContent() {
  const { authFetch } = useAuth();
  const { shell, refreshShell } = useTenantShell();
  const autoSyncedRef = useRef(false);

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
          Manage payment method, billing contact, invoices, and plan changes without leaving
          Cohestra.
        </p>
      </div>

      <InAppBillingPanel
        shellPlan={shell.plan}
        shellBillingStatus={shell.billingStatus}
        shellTrialEndsAt={shell.trialEndsAt}
        onRefreshShell={refreshShell}
      />
    </div>
  );
}
