import { getPublicApiBaseUrl } from "@/lib/api";
import type { LeadStatus } from "@/lib/clients-api";

export type ReportPreset = "weekly" | "monthly" | "custom";

export type ReportFilters = {
  preset: ReportPreset;
  from: string;
  to: string;
  activityId: string;
  community: string;
  leadStatus: LeadStatus | "";
  referralSource: string;
};

export type ReportPeriod = {
  preset: string;
  startAt: string;
  endAt: string;
  computedAt: string;
};

export type ReportFollowUpStatus = {
  newCount: number;
  contactedCount: number;
  activeCount: number;
  inactiveCount: number;
  coveragePercent: number;
};

export type ReportLeadGrowth = {
  newLeadsInPeriod: number;
  totalLeadsAtEnd: number;
  totalLeadsBeforePeriod: number;
};

export type ReportActivityRankingItem = {
  activityId: string;
  activityName: string;
  communityLabel: string;
  registrationCount: number;
};

export type ReportCommunityRankingItem = {
  communityLabel: string;
  registrationCount: number;
};

export type ReportCampaignResults = {
  available: boolean;
  campaignsSent: number;
  campaignsFailed: number;
};

export type ReportResult = {
  period: ReportPeriod;
  activitiesHosted: number;
  registrations: number;
  newLeads: number;
  followUpStatus: ReportFollowUpStatus;
  activityRanking: ReportActivityRankingItem[];
  leadGrowth: ReportLeadGrowth;
  communityRanking: ReportCommunityRankingItem[];
  repeatParticipants: number;
  inactiveClients: number;
  campaignResults: ReportCampaignResults;
};

function parseReportPeriod(raw: Record<string, unknown>): ReportPeriod {
  const preset = raw.preset ?? raw.Preset;
  const startAt = raw.startAt ?? raw.StartAt;
  const endAt = raw.endAt ?? raw.EndAt;
  const computedAt = raw.computedAt ?? raw.ComputedAt;

  if (
    typeof preset !== "string" ||
    typeof startAt !== "string" ||
    typeof endAt !== "string" ||
    typeof computedAt !== "string"
  ) {
    throw new Error("Invalid report period payload");
  }

  return { preset, startAt, endAt, computedAt };
}

function parseFollowUpStatus(raw: Record<string, unknown>): ReportFollowUpStatus {
  const newCount = raw.newCount ?? raw.NewCount;
  const contactedCount = raw.contactedCount ?? raw.ContactedCount;
  const activeCount = raw.activeCount ?? raw.ActiveCount;
  const inactiveCount = raw.inactiveCount ?? raw.InactiveCount;
  const coveragePercent = raw.coveragePercent ?? raw.CoveragePercent;

  if (
    typeof newCount !== "number" ||
    typeof contactedCount !== "number" ||
    typeof activeCount !== "number" ||
    typeof inactiveCount !== "number" ||
    typeof coveragePercent !== "number"
  ) {
    throw new Error("Invalid report follow-up status payload");
  }

  return {
    newCount,
    contactedCount,
    activeCount,
    inactiveCount,
    coveragePercent,
  };
}

function parseLeadGrowth(raw: Record<string, unknown>): ReportLeadGrowth {
  const newLeadsInPeriod = raw.newLeadsInPeriod ?? raw.NewLeadsInPeriod;
  const totalLeadsAtEnd = raw.totalLeadsAtEnd ?? raw.TotalLeadsAtEnd;
  const totalLeadsBeforePeriod = raw.totalLeadsBeforePeriod ?? raw.TotalLeadsBeforePeriod;

  if (
    typeof newLeadsInPeriod !== "number" ||
    typeof totalLeadsAtEnd !== "number" ||
    typeof totalLeadsBeforePeriod !== "number"
  ) {
    throw new Error("Invalid report lead growth payload");
  }

  return { newLeadsInPeriod, totalLeadsAtEnd, totalLeadsBeforePeriod };
}

function parseActivityRankingItem(
  raw: Record<string, unknown>
): ReportActivityRankingItem {
  const activityId = raw.activityId ?? raw.ActivityId;
  const activityName = raw.activityName ?? raw.ActivityName;
  const communityLabel = raw.communityLabel ?? raw.CommunityLabel;
  const registrationCount = raw.registrationCount ?? raw.RegistrationCount;

  if (
    typeof activityId !== "string" ||
    typeof activityName !== "string" ||
    typeof communityLabel !== "string" ||
    typeof registrationCount !== "number"
  ) {
    throw new Error("Invalid report activity ranking item payload");
  }

  return { activityId, activityName, communityLabel, registrationCount };
}

function parseCommunityRankingItem(
  raw: Record<string, unknown>
): ReportCommunityRankingItem {
  const communityLabel = raw.communityLabel ?? raw.CommunityLabel;
  const registrationCount = raw.registrationCount ?? raw.RegistrationCount;

  if (
    typeof communityLabel !== "string" ||
    typeof registrationCount !== "number"
  ) {
    throw new Error("Invalid report community ranking item payload");
  }

  return { communityLabel, registrationCount };
}

function parseCampaignResults(raw: Record<string, unknown>): ReportCampaignResults {
  const available = raw.available ?? raw.Available;
  const campaignsSent = raw.campaignsSent ?? raw.CampaignsSent;
  const campaignsFailed = raw.campaignsFailed ?? raw.CampaignsFailed;

  if (
    typeof available !== "boolean" ||
    typeof campaignsSent !== "number" ||
    typeof campaignsFailed !== "number"
  ) {
    throw new Error("Invalid report campaign results payload");
  }

  return { available, campaignsSent, campaignsFailed };
}

function parseReport(raw: Record<string, unknown>): ReportResult {
  const periodRaw = raw.period ?? raw.Period;
  const activitiesHosted = raw.activitiesHosted ?? raw.ActivitiesHosted;
  const registrations = raw.registrations ?? raw.Registrations;
  const newLeads = raw.newLeads ?? raw.NewLeads;
  const followUpStatusRaw = raw.followUpStatus ?? raw.FollowUpStatus;
  const activityRankingRaw = raw.activityRanking ?? raw.ActivityRanking;
  const leadGrowthRaw = raw.leadGrowth ?? raw.LeadGrowth;
  const communityRankingRaw = raw.communityRanking ?? raw.CommunityRanking;
  const repeatParticipants = raw.repeatParticipants ?? raw.RepeatParticipants;
  const inactiveClients = raw.inactiveClients ?? raw.InactiveClients;
  const campaignResultsRaw = raw.campaignResults ?? raw.CampaignResults;

  if (
    typeof periodRaw !== "object" ||
    periodRaw === null ||
    typeof activitiesHosted !== "number" ||
    typeof registrations !== "number" ||
    typeof newLeads !== "number" ||
    typeof followUpStatusRaw !== "object" ||
    followUpStatusRaw === null ||
    !Array.isArray(activityRankingRaw) ||
    typeof leadGrowthRaw !== "object" ||
    leadGrowthRaw === null ||
    !Array.isArray(communityRankingRaw) ||
    typeof repeatParticipants !== "number" ||
    typeof inactiveClients !== "number" ||
    typeof campaignResultsRaw !== "object" ||
    campaignResultsRaw === null
  ) {
    throw new Error("Invalid report payload");
  }

  return {
    period: parseReportPeriod(periodRaw as Record<string, unknown>),
    activitiesHosted,
    registrations,
    newLeads,
    followUpStatus: parseFollowUpStatus(
      followUpStatusRaw as Record<string, unknown>
    ),
    activityRanking: activityRankingRaw.map((item) =>
      parseActivityRankingItem(item as Record<string, unknown>)
    ),
    leadGrowth: parseLeadGrowth(leadGrowthRaw as Record<string, unknown>),
    communityRanking: communityRankingRaw.map((item) =>
      parseCommunityRankingItem(item as Record<string, unknown>)
    ),
    repeatParticipants,
    inactiveClients,
    campaignResults: parseCampaignResults(
      campaignResultsRaw as Record<string, unknown>
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

function filtersToReportSearchParams(filters: ReportFilters): URLSearchParams {
  const searchParams = new URLSearchParams();
  searchParams.set("preset", filters.preset);

  if (filters.preset === "custom") {
    if (filters.from) {
      searchParams.set("from", filters.from);
    }

    if (filters.to) {
      searchParams.set("to", filters.to);
    }
  }

  if (filters.activityId) {
    searchParams.set("activityId", filters.activityId);
  }

  if (filters.community.trim()) {
    searchParams.set("community", filters.community.trim());
  }

  if (filters.leadStatus) {
    searchParams.set("leadStatus", filters.leadStatus);
  }

  if (filters.referralSource.trim()) {
    searchParams.set("referralSource", filters.referralSource.trim());
  }

  return searchParams;
}

function parseContentDispositionFileName(
  contentDisposition: string | null
): string | null {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const fileNameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return fileNameMatch?.[1] ?? null;
}

export type ReportCsvExportResult = {
  blob: Blob;
  fileName: string;
  registrationRowCount: number;
};

export async function fetchReport(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  filters: ReportFilters
): Promise<ReportResult> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/reports?${filtersToReportSearchParams(filters).toString()}`
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  return parseReport(raw);
}

export async function exportReportCsv(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  filters: ReportFilters
): Promise<ReportCsvExportResult> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/reports/export?${filtersToReportSearchParams(filters).toString()}`
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const registrationRowCount = Number.parseInt(
    response.headers.get("X-Registration-Row-Count") ?? "0",
    10
  );
  const fileName =
    parseContentDispositionFileName(response.headers.get("Content-Disposition")) ??
    `report-${filters.preset}.csv`;

  return {
    blob: await response.blob(),
    fileName,
    registrationRowCount: Number.isFinite(registrationRowCount)
      ? registrationRowCount
      : 0,
  };
}

export function downloadReportCsvExport(exportResult: ReportCsvExportResult): void {
  const objectUrl = URL.createObjectURL(exportResult.blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = exportResult.fileName;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export function filtersFromSearchParams(
  searchParams: URLSearchParams
): ReportFilters {
  const presetParam = searchParams.get("preset");
  const preset: ReportPreset =
    presetParam === "monthly" || presetParam === "custom"
      ? presetParam
      : "weekly";

  const leadStatusParam = searchParams.get("leadStatus");
  const leadStatus: LeadStatus | "" =
    leadStatusParam === "new" ||
    leadStatusParam === "contacted" ||
    leadStatusParam === "active" ||
    leadStatusParam === "inactive"
      ? leadStatusParam
      : "";

  return {
    preset,
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    activityId: searchParams.get("activityId") ?? "",
    community: searchParams.get("community") ?? "",
    leadStatus,
    referralSource: searchParams.get("referralSource") ?? "",
  };
}

export function filtersToSearchParams(filters: ReportFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set("preset", filters.preset);

  if (filters.preset === "custom") {
    if (filters.from) {
      params.set("from", filters.from);
    }

    if (filters.to) {
      params.set("to", filters.to);
    }
  }

  if (filters.activityId) {
    params.set("activityId", filters.activityId);
  }

  if (filters.community.trim()) {
    params.set("community", filters.community.trim());
  }

  if (filters.leadStatus) {
    params.set("leadStatus", filters.leadStatus);
  }

  if (filters.referralSource.trim()) {
    params.set("referralSource", filters.referralSource.trim());
  }

  return params;
}

export function defaultReportFilters(): ReportFilters {
  return {
    preset: "weekly",
    from: "",
    to: "",
    activityId: "",
    community: "",
    leadStatus: "",
    referralSource: "",
  };
}
