import { PageHeader } from "@/components/shared/page-header";
import { ListSkeleton } from "@/components/shared/list-skeleton";

export function FollowUpPageFallback() {
  return (
    <div className="space-y-6">
      <PageHeader title="Follow-up" />
      <div aria-busy="true" aria-label="Loading Follow-up">
        <ListSkeleton rows={6} />
      </div>
    </div>
  );
}
