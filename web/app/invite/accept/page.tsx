import { Suspense } from "react";

import { InviteAcceptPageClient } from "@/components/team/invite-accept-page-client";

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={null}>
      <InviteAcceptPageClient />
    </Suspense>
  );
}
