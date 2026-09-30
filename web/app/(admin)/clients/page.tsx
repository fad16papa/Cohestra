"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { ClientsListPage } from "@/components/clients/clients-list-page";

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
          <h1 className="text-display-sm text-text-warm">Clients</h1>
          <p className="text-sm text-text-muted-warm">Loading clients…</p>
        </div>
      }
    >
      <ClientsPageContent />
    </Suspense>
  );
}
