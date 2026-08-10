import type { BillingPlanLimits, BillingUsage } from "@/lib/billing/billing-api";
import type { TenantShell } from "@/lib/shell/tenant-shell-api";

import type { PaidPlanId } from "@/lib/billing/checkout-validation";

export type PlanTierLimits = {
  seats: number;
  communities: number;
  publishedActivities: number;
  registrationsPerMonth: number;
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

function mapApiLimits(limits: BillingPlanLimits): PlanTierLimits {
  return {
    seats: limits.seats,
    communities: limits.communities,
    publishedActivities: limits.publishedActivities,
    registrationsPerMonth: limits.registrationsPerMonth,
  };
}

function resolveUsage(
  shell: TenantShell | null | undefined,
  usage: BillingUsage | null | undefined
): BillingUsage | null {
  if (usage) {
    return usage;
  }

  if (!shell) {
    return null;
  }

  return {
    seatsUsed: shell.usage.seatsUsed,
    communities: shell.usage.communities,
    publishedActivities: shell.usage.publishedActivities,
    registrationsThisMonth: shell.usage.registrationsThisMonth,
  };
}

function resolveLimitsForPlan(
  targetPlan: PaidPlanId,
  shell: TenantShell | null | undefined,
  coreLimits: BillingPlanLimits | null | undefined,
  proLimits: BillingPlanLimits | null | undefined
): PlanTierLimits | null {
  if (targetPlan === "core" && coreLimits) {
    return mapApiLimits(coreLimits);
  }

  if (targetPlan === "pro" && proLimits) {
    return mapApiLimits(proLimits);
  }

  if (!shell) {
    return null;
  }

  return null;
}

export function getDowngradeLimitWarnings(
  shell: TenantShell | null | undefined,
  targetPlan: PaidPlanId,
  options?: {
    usage?: BillingUsage | null;
    coreLimits?: BillingPlanLimits | null;
    proLimits?: BillingPlanLimits | null;
  }
): string[] {
  const usage = resolveUsage(shell, options?.usage);
  const limits = resolveLimitsForPlan(
    targetPlan,
    shell,
    options?.coreLimits,
    options?.proLimits
  );

  if (!usage || !limits) {
    return [];
  }

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
  targetPlan: PaidPlanId,
  options?: {
    usage?: BillingUsage | null;
    coreLimits?: BillingPlanLimits | null;
    proLimits?: BillingPlanLimits | null;
  }
): boolean {
  return getDowngradeLimitWarnings(shell, targetPlan, options).length > 0;
}
