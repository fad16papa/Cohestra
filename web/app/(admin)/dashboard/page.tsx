import { Suspense } from "react";

import { DashboardGreetingHeader } from "@/components/dashboard/dashboard-greeting-header";
import { DashboardPageClient } from "@/components/dashboard/dashboard-page-client";
import { MetricSkeletonGrid } from "@/components/shared/list-skeleton";

function DashboardFallback() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-8">
      <DashboardGreetingHeader />
      <MetricSkeletonGrid />
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
