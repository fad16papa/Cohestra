"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { ClientsListPage } from "@/components/clients/clients-list-page";
import { PageHeader } from "@/components/shared/page-header";

function ClientsPageContent() {
  const searchParams = useSearchParams();
  const listKey = searchParams.toString() || "all";

  return <ClientsListPage key={listKey} />;
}

export default function ClientsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-2">
          <PageHeader title="Clients" description="Loading clients…" />
        </div>
      }
    >
      <ClientsPageContent />
    </Suspense>
  );
}
