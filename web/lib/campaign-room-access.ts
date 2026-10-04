import {
  entitlementContextFromShell,
  resolveNavEntitlement,
  type NavEntitlement,
} from "@/lib/admin-nav-entitlements";
import { isPlanLockedError } from "@/lib/plan-entitlement";
import { CampaignRequestError } from "@/lib/campaigns-api";

export type CampaignRoomAccess =
  | { kind: "loading" }
  | { kind: "pending" }
  | { kind: "locked"; isTenantAdmin: boolean; entitlement: NavEntitlement }
  | { kind: "open" };

export function resolveCampaignRoomAccess(shell: {
  plan: string | null;
  isTenantAdmin: boolean;
  isBillingOwner: boolean;
} | null, shellLoading: boolean): CampaignRoomAccess {
  if (shellLoading || !shell) {
    return { kind: "loading" };
  }

  const entitlement = resolveNavEntitlement(
    "campaigns",
    entitlementContextFromShell(shell)
  );

  if (entitlement.state === "pending") {
    return { kind: "pending" };
  }

  if (entitlement.state === "locked") {
    return {
      kind: "locked",
      isTenantAdmin: shell.isTenantAdmin === true,
      entitlement,
    };
  }

  return { kind: "open" };
}

export function campaignFetchDenial(error: unknown): {
  denied: boolean;
  planLocked: boolean;
  message: string;
  status: number | null;
} {
  if (isPlanLockedError(error)) {
    return {
      denied: false,
      planLocked: true,
      message: error.message,
      status: error.status,
    };
  }

  if (error instanceof CampaignRequestError) {
    return {
      denied: error.status === 403,
      planLocked: false,
      message: error.message,
      status: error.status,
    };
  }

  return {
    denied: false,
    planLocked: false,
    message: error instanceof Error ? error.message : "Could not load campaigns.",
    status: null,
  };
}
