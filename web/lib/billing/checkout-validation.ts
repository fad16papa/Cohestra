export type PaidPlanId = "core" | "pro";
export type BillingIntervalId = "monthly" | "annual";

const PLAN_RANK: Record<string, number> = {
  basic: 0,
  core: 1,
  pro: 2,
};

export function normalizePlanId(plan: string): PaidPlanId | null {
  const normalized = plan.trim().toLowerCase();
  if (normalized === "core" || normalized === "pro") {
    return normalized;
  }

  return null;
}

export function normalizeBillingInterval(
  interval: string | null | undefined
): BillingIntervalId {
  const normalized = interval?.trim().toLowerCase() ?? "";
  return normalized === "annual" || normalized === "yearly" ? "annual" : "monthly";
}

export function isPaidPlanDowngrade(currentPlan: string, targetPlan: PaidPlanId): boolean {
  const currentRank = PLAN_RANK[currentPlan.trim().toLowerCase()] ?? 0;
  const targetRank = PLAN_RANK[targetPlan] ?? 0;
  return currentRank > targetRank;
}

export function isSamePlanAndInterval(
  currentPlan: string,
  currentInterval: string | null | undefined,
  targetPlan: PaidPlanId,
  targetInterval: BillingIntervalId
): boolean {
  return (
    currentPlan.trim().toLowerCase() === targetPlan
    && normalizeBillingInterval(currentInterval) === targetInterval
  );
}

export function hasActivePaidSubscription(billingStatus: string): boolean {
  const normalized = billingStatus.trim();
  return normalized === "Trialing" || normalized === "Active" || normalized === "PastDue";
}

export function checkoutActionLabel(input: {
  billingStatus: string;
  currentPlan: string;
  hasConsumedTrial: boolean;
  targetPlan: PaidPlanId;
  targetInterval: BillingIntervalId;
  currentInterval: string | null | undefined;
}): string {
  const { billingStatus, currentPlan, hasConsumedTrial, targetPlan, targetInterval, currentInterval } =
    input;

  if (isSamePlanAndInterval(currentPlan, currentInterval, targetPlan, targetInterval)) {
    return "Already on this plan";
  }

  if (isPaidPlanDowngrade(currentPlan, targetPlan)) {
    return `Switch to ${capitalizePlan(targetPlan)} at period end`;
  }

  const sameTier = normalizePlanId(currentPlan) === targetPlan;
  if (sameTier && normalizeBillingInterval(currentInterval) !== targetInterval) {
    return targetInterval === "annual" ? "Switch to yearly billing" : "Switch to monthly billing";
  }

  if (hasActivePaidSubscription(billingStatus)) {
    return `Upgrade to ${capitalizePlan(targetPlan)}`;
  }

  if (hasConsumedTrial) {
    return `Subscribe to ${capitalizePlan(targetPlan)}`;
  }

  return `Start ${capitalizePlan(targetPlan)} trial`;
}

export function checkoutPriceCaption(input: {
  billingStatus: string;
  trialEndsAt: string | null;
  hasConsumedTrial: boolean;
}): string {
  const { billingStatus, trialEndsAt, hasConsumedTrial } = input;

  if (billingStatus === "Trialing" && trialEndsAt) {
    const end = new Date(trialEndsAt);
    return `Trial active until ${end.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    })}`;
  }

  if (hasActivePaidSubscription(billingStatus)) {
    return hasConsumedTrial ? "Billed on your next invoice" : "After trial";
  }

  return hasConsumedTrial ? "Starting today" : "After trial";
}

export function checkoutIntroCopy(input: {
  billingStatus: string;
  currentPlan: string;
  trialEndsAt: string | null;
  hasConsumedTrial: boolean;
  trialPeriodDays: number;
}): string {
  const { billingStatus, currentPlan, trialEndsAt, hasConsumedTrial, trialPeriodDays } = input;

  if (billingStatus === "Trialing" && trialEndsAt) {
    const end = new Date(trialEndsAt);
    return `You are on ${currentPlan} (trialing). Billing starts on ${end.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    })} unless you cancel before then.`;
  }

  if (hasActivePaidSubscription(billingStatus)) {
    return `You are on ${currentPlan}. Upgrades apply immediately with prorated billing. Downgrades take effect at the end of your current billing period.`;
  }

  if (hasConsumedTrial) {
    return "Your workspace has already used its free trial. The selected plan starts billing when you confirm.";
  }

  const trialEnd = new Date();
  trialEnd.setUTCDate(trialEnd.getUTCDate() + trialPeriodDays);
  return `You will not be charged while your trial is active. Billing starts on ${trialEnd.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  })} unless you cancel before then.`;
}

function capitalizePlan(plan: PaidPlanId): string {
  return plan === "pro" ? "Pro" : "Core";
}
