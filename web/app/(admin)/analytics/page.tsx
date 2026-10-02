import { Suspense } from "react";

import { ReportsPageClient } from "@/components/reports/reports-page-client";

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-2">
          <h1 className="text-display-sm text-text-warm">Analytics</h1>
          <p className="text-sm text-text-muted-warm">Loading report…</p>
        </div>
      }
    >
      <ReportsPageClient />
    </Suspense>
  );
}
