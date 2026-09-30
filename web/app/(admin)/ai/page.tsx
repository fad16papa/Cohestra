import { Sparkles } from "lucide-react";
import { Suspense } from "react";

import {
  CanonicalRoomLoading,
  CanonicalRoomStub,
} from "@/components/layouts/canonical-room-stub";
import { DASHBOARD_PATH } from "@/lib/admin-canonical-routes";

export default function CohestraAiPage() {
  return (
    <Suspense fallback={<CanonicalRoomLoading title="Cohestra AI" />}>
      <CanonicalRoomStub
        title="Cohestra AI"
        icon={Sparkles}
        emptyTitle="Cohestra AI comes next"
        emptyDescription="Needs attention stays a Dashboard section. This room is the canonical Cohestra AI destination. Briefs and actions ship in Epic 41."
        primaryHref={DASHBOARD_PATH}
        primaryLabel="Back to Dashboard"
      />
    </Suspense>
  );
}
