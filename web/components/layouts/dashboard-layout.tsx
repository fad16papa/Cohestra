"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { DashboardMetricsRefreshProvider } from "@/components/dashboard/dashboard-metrics-refresh-context";
import { ActivityCalendarNudge } from "@/components/dashboard/activity-calendar-popout";
import { AdminSidebar } from "@/components/layouts/admin-sidebar";
import { AdminMobileTabBar } from "@/components/layouts/admin-mobile-tab-bar";
import { AdminTopBar } from "@/components/layouts/admin-top-bar";
import { AdminShellProvider } from "@/components/layouts/admin-shell-context";
import { AdminRouteTransition } from "@/components/motion/admin-route-transition";
import { BillingBannerBar } from "@/components/shell/billing-banner";
import { TenantShellProvider, useTenantShell } from "@/components/shell/tenant-shell-provider";
import { useToast } from "@/components/ui/toast-provider";
import {
  BILLING_RECONCILE_REASONS,
  checkoutReconcileKey,
  createCheckoutReconcileGate,
  reconcileBillingFromProviderWithAuth,
  resolveCheckoutReturnTrigger,
} from "@/lib/billing/billing-api";
import { adminRouteTransitionKey } from "@/lib/admin-route-motion";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

function DashboardShellBody({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { authFetch } = useAuth();
  const { shell, refreshShell } = useTenantShell();
  const { showSuccessToast, showToast } = useToast();
  const checkoutGateRef = useRef<ReturnType<typeof createCheckoutReconcileGate> | null>(
    null
  );
  const checkoutReturn = resolveCheckoutReturnTrigger({
    billing: searchParams.get("billing"),
    sessionId: searchParams.get("session_id"),
    ptxn: searchParams.get("_ptxn"),
    transactionId: searchParams.get("transaction_id"),
  });
  const billingMessage = searchParams.get("billing_message");
  const shellReady = shell != null;
  const isTenantAdmin = shell?.isTenantAdmin === true;
  const tenantSlug = shell?.tenantSlug ?? "";

  useEffect(() => {
    if (!checkoutReturn.shouldReconcile) {
      return;
    }

    if (!shellReady || !isTenantAdmin || !tenantSlug) {
      return;
    }

    const triggerKey = checkoutReconcileKey(
      tenantSlug,
      checkoutReturn.checkoutSessionId
    );
    checkoutGateRef.current ??= createCheckoutReconcileGate();
    let cancelled = false;
    const pending = checkoutGateRef.current.run(triggerKey, () =>
      reconcileBillingFromProviderWithAuth(authFetch, {
        reason: BILLING_RECONCILE_REASONS.checkoutReturn,
        checkoutSessionId: checkoutReturn.checkoutSessionId,
      }).then((result) => ({ synced: result.synced }))
    );

    async function afterCheckout() {
      try {
        const result = await pending;
        if (cancelled) {
          return;
        }

        await refreshShell();
        if (result.synced && billingMessage) {
          showSuccessToast(billingMessage);
        }

        try {
          const storedWarnings = sessionStorage.getItem("billing_downgrade_warnings");
          if (storedWarnings) {
            sessionStorage.removeItem("billing_downgrade_warnings");
            const warnings = JSON.parse(storedWarnings) as string[];
            if (Array.isArray(warnings) && warnings.length > 0) {
              showToast(
                `Usage exceeds your upcoming plan limits: ${warnings[0]}`
              );
            }
          }
        } catch {
          // Ignore malformed storage payloads.
        }
      } catch (err) {
        if (!cancelled) {
          showToast(
            err instanceof Error
              ? err.message
              : "Could not refresh billing after checkout. Open Settings → Billing to try again."
          );
          await refreshShell();
        }
      }
    }

    void afterCheckout();

    return () => {
      cancelled = true;
    };
  }, [
    authFetch,
    billingMessage,
    checkoutReturn.checkoutSessionId,
    checkoutReturn.shouldReconcile,
    isTenantAdmin,
    refreshShell,
    shellReady,
    showSuccessToast,
    showToast,
    tenantSlug,
  ]);

  return (
    <div
      data-admin-shell
      className="admin-ambient relative flex min-h-0 flex-1 overflow-hidden"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,color-mix(in_srgb,var(--primary)_12%,transparent),transparent)]"
      />
      <AdminSidebar className="relative z-10 hidden md:flex" />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <AdminTopBar />
        {shell?.billingBanner ? (
          <BillingBannerBar
            banner={shell.billingBanner}
            isTenantAdmin={shell.isTenantAdmin}
          />
        ) : null}
        <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:p-6 md:pb-6">
          <AdminRouteTransition key={adminRouteTransitionKey(pathname)}>
            {children}
          </AdminRouteTransition>
        </main>
        <AdminMobileTabBar />
        <ActivityCalendarNudge />
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AdminShellProvider>
      <TenantShellProvider>
        <DashboardMetricsRefreshProvider>
          <DashboardShellBody>{children}</DashboardShellBody>
        </DashboardMetricsRefreshProvider>
      </TenantShellProvider>
    </AdminShellProvider>
  );
}
