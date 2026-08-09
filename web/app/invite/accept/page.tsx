import { Suspense } from "react";

import { InviteAcceptPageClient } from "@/components/team/invite-accept-page-client";

function InviteAcceptLoadingFallback() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-5 py-16">
      <p className="text-sm text-stone">Loading invite…</p>
    </main>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={<InviteAcceptLoadingFallback />}>
      <InviteAcceptPageClient />
    </Suspense>
  );
}
