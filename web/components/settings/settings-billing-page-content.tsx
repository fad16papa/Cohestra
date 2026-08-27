"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { InAppBillingPanel } from "@/components/billing/in-app-billing-panel";
import { useAuth } from "@/components/auth/auth-provider";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { syncBillingFromProviderWithAuth } from "@/lib/billing/billing-api";

function isPaidPlan(plan: string): boolean {
  return plan === "Core" || plan === "Pro";
}

function SettingsBillingBody() {
  const { authFetch } = useAuth();
  const { shell, refreshShell } = useTenantShell();
  const searchParams = useSearchParams();
  const autoSyncedRef = useRef(false);
  const checkoutIncomplete = searchParams.get("billing") === "incomplete";
  const checkoutSessionId =
    searchParams.get("session_id")
    ?? searchParams.get("_ptxn")
    ?? searchParams.get("transaction_id");
  const [incompleteNotice, setIncompleteNotice] = useState(checkoutIncomplete);

  useEffect(() => {
    if (!shell?.isTenantAdmin || autoSyncedRef.current) {
      return;
    }

    if (shell.plan !== "Basic" && !checkoutSessionId) {
      return;
    }

    autoSyncedRef.current = true;
    void syncBillingFromProviderWithAuth(authFetch, checkoutSessionId)
      .then(async (summary) => {
        await refreshShell();
        if (isPaidPlan(summary.plan)) {
          setIncompleteNotice(false);
        }
      })
      .catch(() => undefined);
  }, [authFetch, checkoutSessionId, refreshShell, shell?.isTenantAdmin, shell?.plan]);

  if (!shell?.isTenantAdmin) {
    return (
      <p className="text-sm text-text-muted-warm">
        Billing settings are available to tenant admins only.
      </p>
    );
  }

  if (isPaidPlan(shell.plan) && !shell.isBillingOwner) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-3">
        <h1 className="text-xl font-semibold text-text-warm sm:text-2xl">Billing</h1>
        <p className="text-sm text-text-muted-warm">
          Billing for this workspace is managed by{" "}
          <span className="font-medium text-text-warm">
            {shell.billingOwnerEmail ?? "the workspace owner"}
          </span>
          . Invited admins can use the rest of Cohestra, but plan and payment changes stay with
          the owner account.
        </p>
      </div>
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

      {incompleteNotice && !isPaidPlan(shell.plan) ? (
        <p
          role="status"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-text-warm"
        >
          Paddle opened checkout but has not activated a paid plan yet. Finish the Paddle card
          form with a sandbox test card (4242 4242 4242 4242) until payment succeeds. Then use
          Refresh billing status. In Paddle Notifications you should see{" "}
          <span className="font-medium">transaction.completed</span> and{" "}
          <span className="font-medium">subscription.created</span> as Delivered — not only
          transaction.created.
        </p>
      ) : null}

      <InAppBillingPanel
        shellPlan={shell.plan}
        shellBillingStatus={shell.billingStatus}
        shellTrialEndsAt={shell.trialEndsAt}
        onRefreshShell={refreshShell}
      />
    </div>
  );
}

export function SettingsBillingPageContent() {
  return (
    <Suspense fallback={<p className="text-sm text-text-muted-warm">Loading billing…</p>}>
      <SettingsBillingBody />
    </Suspense>
  );
}
