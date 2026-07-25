"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { DashboardMetricsRefreshProvider } from "@/components/dashboard/dashboard-metrics-refresh-context";
import { AdminSidebar } from "@/components/layouts/admin-sidebar";
import { AdminTopBar } from "@/components/layouts/admin-top-bar";
import { AdminShellProvider } from "@/components/layouts/admin-shell-context";
import { BillingBannerBar } from "@/components/shell/billing-banner";
import { TenantShellProvider, useTenantShell } from "@/components/shell/tenant-shell-provider";
import { syncBillingFromStripeWithAuth } from "@/lib/billing/billing-api";
import { cn } from "@/lib/utils";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

function DashboardShellBody({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { authFetch } = useAuth();
  const { shell, refreshShell } = useTenantShell();

  useEffect(() => {
    const billingSuccess = searchParams.get("billing") === "success";
    const checkoutSessionId = searchParams.get("session_id");
    if (!billingSuccess && !checkoutSessionId) {
      return;
    }

    let cancelled = false;

    async function syncAfterCheckout() {
      try {
        await syncBillingFromStripeWithAuth(authFetch, checkoutSessionId);
      } catch {
        // Webhook may have already synced; still refresh shell below.
      }

      if (!cancelled) {
        await refreshShell();
      }
    }

    void syncAfterCheckout();

    return () => {
      cancelled = true;
    };
  }, [authFetch, refreshShell, searchParams]);

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
            "mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6",
            "animate-page-enter"
          )}
        >
          {children}
        </main>
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
