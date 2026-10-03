"use client";

import { DashboardGreetingHeader } from "@/components/dashboard/dashboard-greeting-header";
import { DashboardViewSwitcher } from "@/components/dashboard/dashboard-view-switcher";
import { MetricSkeletonGrid } from "@/components/shared/list-skeleton";

export function DashboardFallback() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-8">
      <DashboardGreetingHeader />
      <DashboardViewSwitcher value="overview" onChange={() => {}} />
      <div
        id="dashboard-view-panel"
        role="tabpanel"
        aria-labelledby="dashboard-view-overview"
      >
        <MetricSkeletonGrid />
      </div>
    </div>
  );
}
