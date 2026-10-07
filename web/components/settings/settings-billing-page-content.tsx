"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import { InAppBillingPanel } from "@/components/billing/in-app-billing-panel";
import { ProductErrorState } from "@/components/shared/product-error-state";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { SETTINGS_PROFILE_PATH } from "@/lib/admin-canonical-routes";
import { resolveBillingSettingsAccess } from "@/lib/admin-nav-entitlements";
import { CHECKOUT_INCOMPLETE_COPY } from "@/lib/billing/billing-status-copy";
import { isPaidTenantPlan } from "@/lib/shell/tenant-shell-api";
import { isPaddleTransactionId } from "@/lib/billing/paddle-return";

function SettingsBillingBody() {
  const { shell, refreshShell } = useTenantShell();
  const searchParams = useSearchParams();
  const checkoutIncomplete = searchParams.get("billing") === "incomplete";
  const checkoutSuccess = searchParams.get("billing") === "success";
  const checkoutSessionId =
    searchParams.get("session_id")
    ?? searchParams.get("_ptxn")
    ?? searchParams.get("transaction_id");
  const [incompleteNotice] = useState(checkoutIncomplete);

  const access = resolveBillingSettingsAccess({
    plan: shell?.plan,
    isTenantAdmin: shell?.isTenantAdmin,
    isBillingOwner: shell?.isBillingOwner,
  });

  if (!shell || access === "denied") {
    return (
      <ProductErrorState
        title="You don't have permission to manage Billing"
        message="Billing settings are available to tenant admins only. Ask a tenant admin if you need a plan change."
        backHref={SETTINGS_PROFILE_PATH}
        backLabel="Back to your account"
      />
    );
  }

  if (access === "owner-managed") {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-3">
        <p className="text-sm text-text-muted-warm">
          Billing for this workspace is managed by{" "}
          <span className="font-medium text-text-warm">
            {shell?.billingOwnerEmail ?? "the workspace owner"}
          </span>
          . Invited admins can use the rest of Cohestra, but plan and payment changes stay with
          the owner account.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <p className="text-sm text-text-muted-warm">
        Manage billing contact, invoices, and plan changes in Cohestra. Paddle stores your
        payment method from checkout.
      </p>

      {checkoutSuccess ? (
        <p
          role="status"
          className="rounded-xl border border-border-warm bg-card px-4 py-3 text-sm text-text-warm"
        >
          Checkout finished. Refresh billing status if the plan below still looks out of date.
        </p>
      ) : null}

      {incompleteNotice && !isPaidTenantPlan(shell?.plan) ? (
        <p
          role="status"
          className="rounded-xl border border-gold/40 bg-gold/5 px-4 py-3 text-sm text-text-warm"
        >
          {CHECKOUT_INCOMPLETE_COPY}
          {isPaddleTransactionId(checkoutSessionId) ? (
            <>
              {" "}
              <a
                className="font-medium text-text-link underline underline-offset-2"
                href={`/billing/paddle-return?_ptxn=${encodeURIComponent(checkoutSessionId)}`}
              >
                Resume checkout
              </a>
            </>
          ) : null}
        </p>
      ) : null}

      <InAppBillingPanel
        shellPlan={shell.plan}
        shellBillingStatus={shell.billingStatus}
        shellTrialEndsAt={shell.trialEndsAt}
        isComplimentary={shell.isComplimentary}
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
