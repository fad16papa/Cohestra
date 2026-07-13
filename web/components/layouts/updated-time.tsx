"use client";

import { usePathname } from "next/navigation";

import { useDashboardMetricsRefresh } from "@/components/dashboard/dashboard-metrics-refresh-context";

function formatUpdatedTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function UpdatedTime() {
  const pathname = usePathname();
  const refreshContext = useDashboardMetricsRefresh();

  if (pathname !== "/dashboard" || !refreshContext?.lastUpdatedAt) {
    return null;
  }

  return (
    <span className="hidden text-sm text-text-muted-warm sm:inline">
      Updated {formatUpdatedTime(refreshContext.lastUpdatedAt)}
    </span>
  );
}
