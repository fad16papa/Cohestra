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

export type DashboardTrendPoint = {
  /** ISO date (yyyy-MM-dd, UTC). */
  date: string;
  registrations: number;
  newClients: number;
};

export type DashboardLeadStatusBreakdown = {
  newCount: number;
  contactedCount: number;
  activeCount: number;
  inactiveCount: number;
};

export type DashboardMetrics = {
  totalLeads: number;
  newLeadsInPeriod: number;
  periodDays: number;
  activeActivitiesCount: number;
  followUpCoveragePercent: number;
  activityPerformance: ActivityPerformanceItem[];
  computedAt: string;
  registrationsInPeriod: number;
  registrationsInPreviousPeriod: number;
  trendDays: number;
  registrationsTrend: DashboardTrendPoint[];
  leadStatusBreakdown: DashboardLeadStatusBreakdown;
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

function toFiniteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function parseTrendPoint(raw: Record<string, unknown>): DashboardTrendPoint | null {
  const date = raw.date ?? raw.Date;
  if (typeof date !== "string" || date.length === 0) {
    return null;
  }

  return {
    date,
    registrations: toFiniteNumber(raw.registrations ?? raw.Registrations),
    newClients: toFiniteNumber(raw.newClients ?? raw.NewClients),
  };
}

function parseLeadStatusBreakdown(raw: unknown): DashboardLeadStatusBreakdown {
  if (typeof raw !== "object" || raw === null) {
    return { newCount: 0, contactedCount: 0, activeCount: 0, inactiveCount: 0 };
  }

  const record = raw as Record<string, unknown>;
  return {
    newCount: toFiniteNumber(record.newCount ?? record.NewCount),
    contactedCount: toFiniteNumber(record.contactedCount ?? record.ContactedCount),
    activeCount: toFiniteNumber(record.activeCount ?? record.ActiveCount),
    inactiveCount: toFiniteNumber(record.inactiveCount ?? record.InactiveCount),
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

  const registrationsTrendRaw = raw.registrationsTrend ?? raw.RegistrationsTrend;
  const registrationsTrend = Array.isArray(registrationsTrendRaw)
    ? registrationsTrendRaw
        .map((item) =>
          typeof item === "object" && item !== null
            ? parseTrendPoint(item as Record<string, unknown>)
            : null
        )
        .filter((item): item is DashboardTrendPoint => item !== null)
    : [];

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
    registrationsInPeriod: toFiniteNumber(
      raw.registrationsInPeriod ?? raw.RegistrationsInPeriod
    ),
    registrationsInPreviousPeriod: toFiniteNumber(
      raw.registrationsInPreviousPeriod ?? raw.RegistrationsInPreviousPeriod
    ),
    trendDays: toFiniteNumber(raw.trendDays ?? raw.TrendDays),
    registrationsTrend,
    leadStatusBreakdown: parseLeadStatusBreakdown(
      raw.leadStatusBreakdown ?? raw.LeadStatusBreakdown
    ),
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
