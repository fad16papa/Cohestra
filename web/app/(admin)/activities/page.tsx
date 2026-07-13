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
    <Suspense fallback={<p className="text-sm text-text-muted-warm">Loading activities…</p>}>
      <ActivitiesPageContent />
    </Suspense>
  );
}
