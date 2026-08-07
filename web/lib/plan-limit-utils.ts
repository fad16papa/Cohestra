import type { LimitDial, TenantShell } from "@/lib/shell/tenant-shell-api";

export const PLAN_LIMIT_REACHED_SUFFIX =
  "Limit reached — upgrade or free capacity before adding more.";

export function findLimitDial(
  shell: TenantShell | null | undefined,
  key: string
): LimitDial | undefined {
  return shell?.limitDials.find((dial) => dial.key === key);
}

export function formatLimitDialCapacityMessage(dial: LimitDial): string {
  return `${dial.label} is at capacity (${dial.used}/${dial.limit}). ${PLAN_LIMIT_REACHED_SUFFIX}`;
}

export function isPublishedActivitiesBlocked(shell: TenantShell | null | undefined): boolean {
  return findLimitDial(shell, "published")?.blocked ?? false;
}

export function isCommunitiesBlocked(shell: TenantShell | null | undefined): boolean {
  return findLimitDial(shell, "communities")?.blocked ?? false;
}

export function isRegistrationsBlocked(shell: TenantShell | null | undefined): boolean {
  return findLimitDial(shell, "registrations")?.blocked ?? false;
}

export function getPublishedActivitiesLimitMessage(
  shell: TenantShell | null | undefined
): string | null {
  const dial = findLimitDial(shell, "published");
  if (!dial?.blocked) {
    return null;
  }

  return `${formatLimitDialCapacityMessage(dial)} You can still save drafts, but publishing is blocked until you unpublish or archive an activity.`;
}

export function getCommunitiesLimitMessage(
  shell: TenantShell | null | undefined
): string | null {
  const dial = findLimitDial(shell, "communities");
  if (!dial?.blocked) {
    return null;
  }

  return formatLimitDialCapacityMessage(dial);
}

export function getRegistrationsLimitMessage(
  shell: TenantShell | null | undefined
): string | null {
  const dial = findLimitDial(shell, "registrations");
  if (!dial?.blocked) {
    return null;
  }

  return `Monthly registration limit reached (${dial.used.toLocaleString()}/${dial.limit.toLocaleString()}). Public sign-ups are blocked until next month or you upgrade your plan.`;
}

export function getCreateActivityPlanWarnings(
  shell: TenantShell | null | undefined
): string[] {
  const warnings: string[] = [];
  const publishedMessage = getPublishedActivitiesLimitMessage(shell);
  const registrationsMessage = getRegistrationsLimitMessage(shell);

  if (publishedMessage) {
    warnings.push(publishedMessage);
  }

  if (registrationsMessage) {
    warnings.push(registrationsMessage);
  }

  return warnings;
}
