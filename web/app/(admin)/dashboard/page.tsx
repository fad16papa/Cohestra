import { Suspense } from "react";

import { DashboardGreetingHeader } from "@/components/dashboard/dashboard-greeting-header";
import { DashboardPageClient } from "@/components/dashboard/dashboard-page-client";
import { DashboardViewSwitcher } from "@/components/dashboard/dashboard-view-switcher";
import { MetricSkeletonGrid } from "@/components/shared/list-skeleton";

function DashboardFallback() {
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

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardPageClient />
    </Suspense>
  );
}
