"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { ActivitiesListPage } from "@/components/activities/activities-list-page";

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
          <h1 className="text-display-sm text-text-warm">Activities</h1>
          <p className="text-sm text-text-muted-warm">Loading activities…</p>
        </div>
      }
    >
      <ActivitiesPageContent />
    </Suspense>
  );
}
