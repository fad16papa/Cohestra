import { Suspense } from "react";

import { CohestraAiPageClient } from "@/components/intelligence/cohestra-ai-page-client";
import { PageHeader } from "@/components/shared/page-header";

export default function CohestraAiPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-2">
          <PageHeader title="Cohestra AI" description="Loading Cohestra AI…" />
        </div>
      }
    >
      <CohestraAiPageClient />
    </Suspense>
  );
}
