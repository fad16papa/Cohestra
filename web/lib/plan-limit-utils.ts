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

export type ActivitiesAtCapBannerState = {
  variant: "blocked" | "warn";
  publishedLine: string | null;
  registrationsLine: string | null;
  showReviewPublished: boolean;
  showUpgradeLink: boolean;
};

function isDialAtCapOrWarn(dial: LimitDial | undefined): boolean {
  return Boolean(dial?.blocked || dial?.warn);
}

export function shouldShowActivitiesRecoveryChips(
  shell: TenantShell | null | undefined
): boolean {
  const publishedDial = findLimitDial(shell, "published");
  const registrationsDial = findLimitDial(shell, "registrations");

  return (
    isDialAtCapOrWarn(publishedDial) || isDialAtCapOrWarn(registrationsDial)
  );
}

export function shouldShowPublishedOnlyChip(
  shell: TenantShell | null | undefined
): boolean {
  const publishedDial = findLimitDial(shell, "published");
  const registrationsDial = findLimitDial(shell, "registrations");

  return (
    isDialAtCapOrWarn(publishedDial) || Boolean(registrationsDial?.blocked)
  );
}

export function getPublishedActivitiesUsageCount(
  shell: TenantShell | null | undefined
): number {
  return (
    findLimitDial(shell, "published")?.used ??
    shell?.usage.publishedActivities ??
    0
  );
}

export function getActivitiesAtCapBannerState(
  shell: TenantShell | null | undefined
): ActivitiesAtCapBannerState | null {
  const publishedDial = findLimitDial(shell, "published");
  const registrationsDial = findLimitDial(shell, "registrations");

  const publishedBlocked = publishedDial?.blocked ?? false;
  const publishedWarn = publishedDial?.warn ?? false;
  const registrationsBlocked = registrationsDial?.blocked ?? false;
  const registrationsWarn = registrationsDial?.warn ?? false;

  if (
    !publishedBlocked &&
    !publishedWarn &&
    !registrationsBlocked &&
    !registrationsWarn
  ) {
    return null;
  }

  const variant =
    publishedBlocked || registrationsBlocked ? "blocked" : "warn";

  let publishedLine: string | null = null;
  if (publishedBlocked && publishedDial) {
    publishedLine = `Published activities at capacity (${publishedDial.used}/${publishedDial.limit}). Archive or unpublish one to publish another.`;
  } else if (publishedWarn && publishedDial) {
    publishedLine = `Published activities at ${publishedDial.percent}% of your plan limit (${publishedDial.used}/${publishedDial.limit}). Consider freeing a slot before you hit capacity.`;
  }

  let registrationsLine: string | null = null;
  if (registrationsBlocked && registrationsDial) {
    registrationsLine = `Monthly sign-ups paused (${registrationsDial.used.toLocaleString()}/${registrationsDial.limit.toLocaleString()}). Public sign-ups are blocked until next month or you upgrade your plan.`;
  } else if (registrationsWarn && registrationsDial) {
    registrationsLine = `Monthly registrations at ${registrationsDial.percent}% of your plan limit (${registrationsDial.used.toLocaleString()}/${registrationsDial.limit.toLocaleString()}).`;
  }

  return {
    variant,
    publishedLine,
    registrationsLine,
    showReviewPublished: publishedBlocked || publishedWarn,
    showUpgradeLink: registrationsBlocked || registrationsWarn,
  };
}

export function getRegistrationsDialForCards(
  shell: TenantShell | null | undefined
): LimitDial | null {
  const dial = findLimitDial(shell, "registrations");
  if (!dial || (!dial.warn && !dial.blocked)) {
    return null;
  }

  return dial;
}

export function shouldShowPlanRegCapOnActivityCard(
  activityStatus: string,
  dial: LimitDial | null | undefined
): boolean {
  return (
    activityStatus === "published" && Boolean(dial && (dial.warn || dial.blocked))
  );
}

export function shouldShowSignUpsPausedBadge(
  activityStatus: string,
  dial: LimitDial | null | undefined
): boolean {
  return activityStatus === "published" && Boolean(dial?.blocked);
}
