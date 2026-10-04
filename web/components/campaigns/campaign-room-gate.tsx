import type { ReactNode } from "react";

import { ListSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { ProductErrorState } from "@/components/shared/product-error-state";
import { UpgradePanel } from "@/components/shell/upgrade-panel";
import type { CampaignRoomAccess } from "@/lib/campaign-room-access";

const LOCK_TITLE = "Email campaigns are a Pro craft";
const LOCK_DESCRIPTION =
  "Campaigns unlock on Pro — segmented outreach, delivery tracking, and campaign history on client profiles.";

type CampaignRoomGateProps = {
  title: string;
  description?: string;
  access: CampaignRoomAccess;
  denied?: boolean;
  deniedMessage?: string;
  planLockedOverride?: boolean;
  isTenantAdmin?: boolean;
};

export function CampaignRoomChrome({
  title,
  description,
  access,
  denied = false,
  deniedMessage,
  planLockedOverride = false,
  isTenantAdmin = false,
  children,
}: CampaignRoomGateProps & { children: ReactNode }) {
  if (access.kind === "loading") {
    return (
      <div className="space-y-6">
        <PageHeader title={title} description={description ?? "Loading campaigns…"} />
        <ListSkeleton rows={4} />
      </div>
    );
  }

  if (access.kind === "pending") {
    return (
      <div className="space-y-6">
        <PageHeader title={title} description={description} />
        <p role="status" className="text-sm text-text-muted-warm">
          Checking campaign access… Workspace plan is still being confirmed. Checkout is
          not offered until the plan is known.
        </p>
      </div>
    );
  }

  if (access.kind === "locked" || planLockedOverride) {
    const admin =
      access.kind === "locked" ? access.isTenantAdmin : isTenantAdmin;
    return (
      <div className="space-y-6">
        <PageHeader title={title} description={description} />
        <UpgradePanel
          title={LOCK_TITLE}
          description={LOCK_DESCRIPTION}
          requiredPlan="Pro"
          isTenantAdmin={admin}
        />
      </div>
    );
  }

  if (denied) {
    return (
      <div className="space-y-6">
        <PageHeader title={title} description={description} />
        <ProductErrorState
          title="You don’t have access to Campaigns"
          message={deniedMessage ?? "Your role cannot open Campaigns."}
          backHref="/dashboard"
          backLabel="Back to Dashboard"
        />
      </div>
    );
  }

  return <>{children}</>;
}
