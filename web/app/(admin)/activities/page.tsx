"use client";

import { Suspense } from "react";

import { ActivitiesListPage } from "@/components/activities/activities-list-page";
import { PageHeader } from "@/components/shared/page-header";

export default function ActivitiesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-2">
          <PageHeader title="Activities" description="Loading activities…" />
        </div>
      }
    >
      <ActivitiesListPage />
    </Suspense>
  );
}
