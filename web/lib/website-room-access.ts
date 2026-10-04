import {
  entitlementContextFromShell,
  resolveNavEntitlement,
  type NavEntitlement,
} from "@/lib/admin-nav-entitlements";
import { isPlanLockedError, SiteRequestError } from "@/lib/plan-entitlement";

export type WebsiteRoomAccess =
  | { kind: "loading" }
  | { kind: "pending" }
  | { kind: "locked"; isTenantAdmin: boolean; entitlement: NavEntitlement }
  | { kind: "open" };

export function resolveWebsiteRoomAccess(
  shell: {
    plan: string | null;
    isTenantAdmin: boolean;
    isBillingOwner: boolean;
  } | null,
  shellLoading: boolean
): WebsiteRoomAccess {
  if (shellLoading || !shell) {
    return { kind: "loading" };
  }

  const entitlement = resolveNavEntitlement(
    "website",
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

export function websiteFetchDenial(error: unknown): {
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

  if (error instanceof SiteRequestError) {
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
    message: error instanceof Error ? error.message : "Could not load Website Studio.",
    status: null,
  };
}
