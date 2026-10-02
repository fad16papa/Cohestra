import { ListTodo } from "lucide-react";
import { Suspense } from "react";

import {
  CanonicalRoomLoading,
  CanonicalRoomStub,
} from "@/components/layouts/canonical-room-stub";
import { CLIENTS_PATH, DASHBOARD_PATH } from "@/lib/admin-canonical-routes";

export default function FollowUpPage() {
  return (
    <Suspense fallback={<CanonicalRoomLoading title="Follow-up" />}>
      <CanonicalRoomStub
        title="Follow-up"
        icon={ListTodo}
        emptyTitle="Follow-up queue comes next"
        emptyDescription="This is the primary Follow-up room. The relationship queue, categories, and follow-up actions ship in Epic 40."
        primaryHref={DASHBOARD_PATH}
        primaryLabel="Back to Dashboard"
        secondaryHref={CLIENTS_PATH}
        secondaryLabel="View clients"
      />
    </Suspense>
  );
}
