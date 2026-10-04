"use client";

import { Suspense } from "react";

import { ClientsListPage } from "@/components/clients/clients-list-page";
import { PageHeader } from "@/components/shared/page-header";

function ClientsPageContent() {
  return <ClientsListPage />;
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
