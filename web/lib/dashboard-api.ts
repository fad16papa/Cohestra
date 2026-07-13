import { getPublicApiBaseUrl } from "@/lib/api";
import type { ActivityStatus } from "@/lib/activities-api";

export type ActivityPerformanceItem = {
  activityId: string;
  activityName: string;
  communityLabel: string;
  category: string;
  status: ActivityStatus;
  registrationCount: number;
};

export type DashboardMetrics = {
  totalLeads: number;
  newLeadsInPeriod: number;
  periodDays: number;
  activeActivitiesCount: number;
  followUpCoveragePercent: number;
  activityPerformance: ActivityPerformanceItem[];
  computedAt: string;
};

function parseActivityPerformanceItem(
  raw: Record<string, unknown>
): ActivityPerformanceItem {
  const activityId = raw.activityId ?? raw.ActivityId;
  const activityName = raw.activityName ?? raw.ActivityName;
  const communityLabel = raw.communityLabel ?? raw.CommunityLabel;
  const category = raw.category ?? raw.Category;
  const status = raw.status ?? raw.Status;
  const registrationCount = raw.registrationCount ?? raw.RegistrationCount;

  if (
    typeof activityId !== "string" ||
    typeof activityName !== "string" ||
    typeof communityLabel !== "string" ||
    typeof category !== "string" ||
    typeof status !== "string" ||
    typeof registrationCount !== "number"
  ) {
    throw new Error("Invalid activity performance item payload");
  }

  return {
    activityId,
    activityName,
    communityLabel,
    category,
    status: status as ActivityStatus,
    registrationCount,
  };
}

function parseDashboardMetrics(raw: Record<string, unknown>): DashboardMetrics {
  const totalLeads = raw.totalLeads ?? raw.TotalLeads;
  const newLeadsInPeriod = raw.newLeadsInPeriod ?? raw.NewLeadsInPeriod;
  const periodDays = raw.periodDays ?? raw.PeriodDays;
  const activeActivitiesCount = raw.activeActivitiesCount ?? raw.ActiveActivitiesCount;
  const followUpCoveragePercent =
    raw.followUpCoveragePercent ?? raw.FollowUpCoveragePercent;
  const activityPerformanceRaw = raw.activityPerformance ?? raw.ActivityPerformance;
  const computedAt = raw.computedAt ?? raw.ComputedAt;

  if (
    typeof totalLeads !== "number" ||
    typeof newLeadsInPeriod !== "number" ||
    typeof periodDays !== "number" ||
    typeof activeActivitiesCount !== "number" ||
    typeof followUpCoveragePercent !== "number" ||
    typeof computedAt !== "string"
  ) {
    throw new Error("Invalid dashboard metrics payload");
  }

  if (!Array.isArray(activityPerformanceRaw)) {
    throw new Error("Invalid dashboard metrics payload");
  }

  return {
    totalLeads,
    newLeadsInPeriod,
    periodDays,
    activeActivitiesCount,
    followUpCoveragePercent,
    activityPerformance: activityPerformanceRaw.map((item) =>
      parseActivityPerformanceItem(item as Record<string, unknown>)
    ),
    computedAt,
  };
}

async function parseProblemDetail(response: Response): Promise<string> {
  try {
    const raw = (await response.json()) as Record<string, unknown>;
    const detail = raw.detail ?? raw.Detail;
    if (typeof detail === "string" && detail.length > 0) {
      return detail;
    }
  } catch {
    // fall through
  }

  return `Request failed (${response.status})`;
}

export async function fetchDashboardMetrics(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<DashboardMetrics> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/dashboard/metrics`
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return parseDashboardMetrics(raw);
}
