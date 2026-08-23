"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { DashboardMetricsRefreshProvider } from "@/components/dashboard/dashboard-metrics-refresh-context";
import { ActivityCalendarNudge } from "@/components/dashboard/activity-calendar-popout";
import { AdminSidebar } from "@/components/layouts/admin-sidebar";
import { AdminMobileTabBar } from "@/components/layouts/admin-mobile-tab-bar";
import { AdminTopBar } from "@/components/layouts/admin-top-bar";
import { AdminShellProvider } from "@/components/layouts/admin-shell-context";
import { BillingBannerBar } from "@/components/shell/billing-banner";
import { TenantShellProvider, useTenantShell } from "@/components/shell/tenant-shell-provider";
import { useToast } from "@/components/ui/toast-provider";
import { syncBillingFromProviderWithAuth } from "@/lib/billing/billing-api";
import { cn } from "@/lib/utils";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

function DashboardShellBody({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { authFetch } = useAuth();
  const { shell, refreshShell } = useTenantShell();
  const { showSuccessToast, showToast } = useToast();

  useEffect(() => {
    const billingSuccess = searchParams.get("billing") === "success";
    const checkoutSessionId =
      searchParams.get("session_id")
      ?? searchParams.get("_ptxn")
      ?? searchParams.get("transaction_id");
    const billingMessage = searchParams.get("billing_message");
    if (!billingSuccess && !checkoutSessionId) {
      return;
    }

    let cancelled = false;

    async function syncAfterCheckout() {
      try {
        await syncBillingFromProviderWithAuth(authFetch, checkoutSessionId);
      } catch {
        // Webhook may have already synced; still refresh shell below.
      }

      if (!cancelled) {
        await refreshShell();
        if (billingMessage) {
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
      }
    }

    void syncAfterCheckout();

    return () => {
      cancelled = true;
    };
  }, [authFetch, refreshShell, searchParams, showSuccessToast, showToast]);

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
        <main
          key={pathname}
          className={cn(
            "mx-auto w-full max-w-7xl flex-1 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:p-6 md:pb-6",
            "animate-page-enter"
          )}
        >
          {children}
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
