import type { TenantShell } from "@/lib/shell/tenant-shell-api";

import type { PaidPlanId } from "@/lib/billing/checkout-validation";

type PlanTierLimits = {
  seats: number;
  communities: number;
  publishedActivities: number;
  registrationsPerMonth: number;
};

const PLAN_TIER_LIMITS: Record<PaidPlanId | "basic", PlanTierLimits> = {
  basic: { seats: 1, communities: 1, publishedActivities: 4, registrationsPerMonth: 250 },
  core: { seats: 3, communities: 3, publishedActivities: 12, registrationsPerMonth: 500 },
  pro: { seats: 10, communities: 10, publishedActivities: 50, registrationsPerMonth: 5000 },
};

function planLabel(plan: PaidPlanId): string {
  return plan === "pro" ? "Pro" : "Core";
}

function exceedsSeatsLimit(used: number, limit: number): boolean {
  return used > limit;
}

function exceedsCapacityLimit(used: number, limit: number): boolean {
  return used >= limit;
}

export function getDowngradeLimitWarnings(
  shell: TenantShell | null | undefined,
  targetPlan: PaidPlanId
): string[] {
  if (!shell) {
    return [];
  }

  const limits = PLAN_TIER_LIMITS[targetPlan];
  const usage = shell.usage;
  const warnings: string[] = [];
  const label = planLabel(targetPlan);

  if (exceedsSeatsLimit(usage.seatsUsed, limits.seats)) {
    warnings.push(
      `Team seats: you have ${usage.seatsUsed} but ${label} allows ${limits.seats}. Remove members or pending invites before the switch date.`
    );
  }

  if (exceedsCapacityLimit(usage.communities, limits.communities)) {
    warnings.push(
      `Communities: you have ${usage.communities} but ${label} allows ${limits.communities}. Archive or merge communities before the switch date.`
    );
  }

  if (exceedsCapacityLimit(usage.publishedActivities, limits.publishedActivities)) {
    warnings.push(
      `Published activities: you have ${usage.publishedActivities} but ${label} allows ${limits.publishedActivities}. Unpublish or archive activities before the switch date.`
    );
  }

  if (exceedsCapacityLimit(usage.registrationsThisMonth, limits.registrationsPerMonth)) {
    warnings.push(
      `Registrations this month: you have ${usage.registrationsThisMonth.toLocaleString()} but ${label} allows ${limits.registrationsPerMonth.toLocaleString()}. Usage may block public sign-ups after the switch until the next reset.`
    );
  }

  return warnings;
}

export function hasDowngradeLimitWarnings(
  shell: TenantShell | null | undefined,
  targetPlan: PaidPlanId
): boolean {
  return getDowngradeLimitWarnings(shell, targetPlan).length > 0;
}
