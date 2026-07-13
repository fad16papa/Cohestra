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
    <Suspense fallback={<p className="text-sm text-text-muted-warm">Loading clients…</p>}>
      <ClientsPageContent />
    </Suspense>
  );
}
