import { describeBillingStatus } from "@/lib/billing/billing-status-copy";

export type PlatformTenantStatusPresentation = {
  label: string;
  headline: string;
  detail: string | null;
};

export function describePlatformTenantStatus(
  status: string | null | undefined
): PlatformTenantStatusPresentation {
  switch (status) {
    case "Suspended":
      return {
        label: "Suspended",
        headline: "Workspace paused.",
        detail:
          "Break-glass freeze for abuse, ToS, or support — not collections.",
      };
    case "Archived":
      return {
        label: "Archived",
        headline: "Workspace archived.",
        detail: "Soft archive. The workspace is no longer operational.",
      };
    case "Active":
      return {
        label: "Active",
        headline: "Active",
        detail: null,
      };
    default:
      return {
        label: status && status.trim() !== "" ? status : "Unknown",
        headline: status && status.trim() !== "" ? status : "Unknown",
        detail: null,
      };
  }
}

export function describePlatformBillingStatus(status: string | null | undefined) {
  return describeBillingStatus(status);
}
