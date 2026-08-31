import type { ActivityStatus } from "@/lib/activities-api";

export type PublicRegistrationUnavailableReason =
  | "not-found"
  | "unavailable"
  | "full"
  | "plan-limit"
  | "close-at"
  | "error";

export type RegistrationUnavailableChip = "Full" | "Paused" | "Ended" | "Closed";

export function resolveRegistrationUnavailableChip(
  reason: PublicRegistrationUnavailableReason,
  activityStatus?: ActivityStatus
): RegistrationUnavailableChip | null {
  if (reason === "full") {
    return "Full";
  }

  if (reason === "plan-limit") {
    return "Paused";
  }

  if (reason === "close-at") {
    return "Closed";
  }

  if (reason === "unavailable") {
    return activityStatus === "published" ? "Ended" : "Closed";
  }

  return null;
}

export const registrationUnavailablePlatformCopy: Record<
  Exclude<PublicRegistrationUnavailableReason, "error" | "plan-limit">,
  { title: string; description: string }
> = {
  "not-found": {
    title: "Activity not found",
    description: "This registration link may be incorrect or no longer available.",
  },
  unavailable: {
    title: "Registration closed",
    description: "This activity is no longer accepting registrations.",
  },
  full: {
    title: "Activity full",
    description:
      "This activity has reached its registration limit and is no longer accepting sign-ups.",
  },
  "close-at": {
    title: "Registration closed",
    description: "This activity is no longer accepting registrations.",
  },
};
