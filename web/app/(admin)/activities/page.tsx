"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { ActivitiesListPage } from "@/components/activities/activities-list-page";
import { PageHeader } from "@/components/shared/page-header";

function ActivitiesPageContent() {
  const searchParams = useSearchParams();
  const listKey = searchParams.toString() || "all";

  return <ActivitiesListPage key={listKey} />;
}

export default function ActivitiesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-2">
          <PageHeader title="Activities" description="Loading activities…" />
        </div>
      }
    >
      <ActivitiesPageContent />
    </Suspense>
  );
}
