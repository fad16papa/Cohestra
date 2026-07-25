import { Suspense } from "react";

import { InviteAcceptPageClient } from "@/components/team/invite-accept-page-client";

export default function InviteAcceptPage() {
  return (
    <main className="min-h-screen bg-paper2 px-4 py-16">
      <Suspense fallback={<p className="text-sm text-stone">Loading invite…</p>}>
        <InviteAcceptPageClient />
      </Suspense>
    </main>
  );
}
