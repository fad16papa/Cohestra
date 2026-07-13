"use client";

import { Suspense } from "react";

import { ReportsPageClient } from "@/components/reports/reports-page-client";

export default function ReportsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-text-muted-warm">Loading report…</p>}>
      <ReportsPageClient />
    </Suspense>
  );
}
