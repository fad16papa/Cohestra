"use client";

import { usePathname } from "next/navigation";

import { DashboardMetricsRefreshProvider } from "@/components/dashboard/dashboard-metrics-refresh-context";
import { AdminSidebar } from "@/components/layouts/admin-sidebar";
import { AdminTopBar } from "@/components/layouts/admin-top-bar";
import { AdminShellProvider } from "@/components/layouts/admin-shell-context";
import { cn } from "@/lib/utils";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();

  return (
    <AdminShellProvider>
      <DashboardMetricsRefreshProvider>
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
      </DashboardMetricsRefreshProvider>
    </AdminShellProvider>
  );
}
