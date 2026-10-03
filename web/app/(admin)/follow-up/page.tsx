import { Suspense } from "react";

import { FollowUpPageClient } from "@/components/follow-up/follow-up-page-client";
import { FollowUpPageFallback } from "@/components/follow-up/follow-up-page-fallback";

export default function FollowUpPage() {
  return (
    <Suspense fallback={<FollowUpPageFallback />}>
      <FollowUpPageClient />
    </Suspense>
  );
}
