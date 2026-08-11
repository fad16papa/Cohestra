import type { DashboardMetrics } from "@/lib/dashboard-api";

export const DASHBOARD_ONBOARDING_DISMISSED_KEY = "cohestra.dashboard.onboarding-dismissed";

/** Show the checklist while the tenant is still in early setup. */
export const DASHBOARD_ONBOARDING_LOW_ACTIVITY_MAX = 3;

export type DashboardOnboardingStepId =
  | "create-activity"
  | "publish"
  | "first-registration"
  | "first-follow-up";

export type DashboardOnboardingStep = {
  id: DashboardOnboardingStepId;
  label: string;
  detail: string;
  href: string;
};

export const DASHBOARD_ONBOARDING_STEPS: DashboardOnboardingStep[] = [
  {
    id: "create-activity",
    label: "Create an activity",
    detail: "Set up a registration form for your next event or program.",
    href: "/activities/new",
  },
  {
    id: "publish",
    label: "Publish an activity",
    detail: "Go live to get a shareable link and QR code.",
    href: "/activities?status=published",
  },
  {
    id: "first-registration",
    label: "Capture your first registration",
    detail: "Share your link — new sign-ups appear in Clients automatically.",
    href: "/clients?leadStatus=new",
  },
  {
    id: "first-follow-up",
    label: "Log your first follow-up",
    detail: "Mark a lead as contacted or send a WhatsApp / Viber message.",
    href: "/clients?leadStatus=new",
  },
];

export type DashboardOnboardingItem = DashboardOnboardingStep & {
  done: boolean;
};

export function isDashboardOnboardingDismissed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(DASHBOARD_ONBOARDING_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissDashboardOnboarding(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(DASHBOARD_ONBOARDING_DISMISSED_KEY, "1");
  } catch {
    // Ignore private browsing / quota errors.
  }
}

export function buildDashboardOnboardingItems(
  metrics: DashboardMetrics,
  totalActivityCount: number
): DashboardOnboardingItem[] {
  const contactedOrActive =
    metrics.leadStatusBreakdown.contactedCount + metrics.leadStatusBreakdown.activeCount;

  const completionByStep: Record<DashboardOnboardingStepId, boolean> = {
    "create-activity": totalActivityCount > 0,
    publish: metrics.activeActivitiesCount > 0,
    "first-registration": metrics.totalLeads > 0,
    "first-follow-up": contactedOrActive > 0,
  };

  return DASHBOARD_ONBOARDING_STEPS.map((step) => ({
    ...step,
    done: completionByStep[step.id],
  }));
}

export function countCompletedOnboardingSteps(items: DashboardOnboardingItem[]): {
  completed: number;
  total: number;
} {
  const completed = items.filter((item) => item.done).length;
  return { completed, total: items.length };
}

export function shouldShowDashboardOnboarding(
  metrics: DashboardMetrics,
  totalActivityCount: number,
  dismissed: boolean
): boolean {
  if (dismissed) {
    return false;
  }

  const items = buildDashboardOnboardingItems(metrics, totalActivityCount);
  const { completed, total } = countCompletedOnboardingSteps(items);

  if (completed === total) {
    return false;
  }

  return totalActivityCount <= DASHBOARD_ONBOARDING_LOW_ACTIVITY_MAX;
}
