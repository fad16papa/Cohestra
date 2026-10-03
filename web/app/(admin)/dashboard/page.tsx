import { Suspense } from "react";

import { DashboardFallback } from "@/components/dashboard/dashboard-page-fallback";
import { DashboardPageClient } from "@/components/dashboard/dashboard-page-client";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardPageClient />
    </Suspense>
  );
}
