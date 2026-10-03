import { Suspense } from "react";

import { ReportsPageClient } from "@/components/reports/reports-page-client";
import { PageHeader } from "@/components/shared/page-header";

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-2">
          <PageHeader title="Analytics" description="Loading report…" />
        </div>
      }
    >
      <ReportsPageClient />
    </Suspense>
  );
}
