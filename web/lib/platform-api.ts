import { fetchWithAuth } from "@/lib/auth-api";
import { getPublicApiBaseUrl } from "@/lib/api";
import { isFakeHealthCopy } from "@/lib/platform-overview";

export type TenantListItem = {
  id: string;
  slug: string;
  name: string;
  plan: string;
  status: string;
  billingStatus: string;
  isComplimentary: boolean;
  adminContactEmail: string | null;
  createdAt: string;
  activityCount: number;
  clientCount: number;
};

export type TenantListResponse = {
  items: TenantListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type TenantResponse = {
  id: string;
  slug: string;
  name: string;
  plan: string;
  status: string;
  billingStatus: string;
  isComplimentary: boolean;
  adminContactEmail: string | null;
  suspendedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlatformAuditEntry = {
  id: string;
  actorUserId: string;
  actorEmail: string | null;
  tenantId: string;
  action: string;
  reason: string | null;
  createdAt: string;
};

export type TenantDetailResponse = {
  tenant: TenantResponse;
  recentAudits: PlatformAuditEntry[];
};

export const PLATFORM_TIMELINE_TYPES = [
  "audit",
  "support",
  "outbox",
  "paddle",
  "billing_snapshot",
] as const;

export type PlatformTenantTimelineType = (typeof PLATFORM_TIMELINE_TYPES)[number];

export type PlatformTenantTimelineItem = {
  id: string;
  type: PlatformTenantTimelineType;
  timestamp: string;
  provenance: string;
  summary: string;
  metadata: Record<string, string | null>;
};

export type PlatformTenantTimelineSource = {
  source: string;
  state: "present" | "empty" | "missing_instrumentation";
  itemCount: number;
};

export type PlatformTenantTimelineResponse = {
  tenantId: string;
  observedAt: string;
  hasHistoricalEvents: boolean;
  items: PlatformTenantTimelineItem[];
  sources: PlatformTenantTimelineSource[];
};

type AuthFetch = (input: string, init?: RequestInit) => Promise<Response>;

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

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function pickString(raw: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string") {
      return value;
    }
  }
  return null;
}

function pickNumber(raw: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
}

function pickBoolean(raw: Record<string, unknown>, ...keys: string[]): boolean {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "boolean") {
      return value;
    }
  }
  return false;
}

function parseTenantListItem(raw: Record<string, unknown>): TenantListItem {
  const id = pickString(raw, "id", "Id");
  const slug = pickString(raw, "slug", "Slug");
  const name = pickString(raw, "name", "Name");
  const plan = pickString(raw, "plan", "Plan");
  const status = pickString(raw, "status", "Status");
  const billingStatus = pickString(raw, "billingStatus", "BillingStatus");
  const createdAt = pickString(raw, "createdAt", "CreatedAt");
  if (!id || !slug || !name || !plan || !status || !billingStatus || !createdAt) {
    throw new Error("Invalid tenant list item");
  }
  return {
    id,
    slug,
    name,
    plan,
    status,
    billingStatus,
    isComplimentary: pickBoolean(raw, "isComplimentary", "IsComplimentary"),
    adminContactEmail: pickString(raw, "adminContactEmail", "AdminContactEmail"),
    createdAt,
    activityCount: pickNumber(raw, "activityCount", "ActivityCount"),
    clientCount: pickNumber(raw, "clientCount", "ClientCount"),
  };
}

function parseTenant(raw: Record<string, unknown>): TenantResponse {
  const id = pickString(raw, "id", "Id");
  const slug = pickString(raw, "slug", "Slug");
  const name = pickString(raw, "name", "Name");
  const plan = pickString(raw, "plan", "Plan");
  const status = pickString(raw, "status", "Status");
  const billingStatus = pickString(raw, "billingStatus", "BillingStatus");
  const createdAt = pickString(raw, "createdAt", "CreatedAt");
  const updatedAt = pickString(raw, "updatedAt", "UpdatedAt");
  if (!id || !slug || !name || !plan || !status || !billingStatus || !createdAt || !updatedAt) {
    throw new Error("Invalid tenant payload");
  }
  return {
    id,
    slug,
    name,
    plan,
    status,
    billingStatus,
    isComplimentary: pickBoolean(raw, "isComplimentary", "IsComplimentary"),
    adminContactEmail: pickString(raw, "adminContactEmail", "AdminContactEmail"),
    suspendedAt: pickString(raw, "suspendedAt", "SuspendedAt"),
    archivedAt: pickString(raw, "archivedAt", "ArchivedAt"),
    createdAt,
    updatedAt,
  };
}

function parseAudit(raw: Record<string, unknown>): PlatformAuditEntry {
  if (
    raw.detailsJson !== undefined ||
    raw.DetailsJson !== undefined ||
    raw.details !== undefined ||
    raw.Details !== undefined
  ) {
    throw new Error("Audit payload leaked DetailsJson");
  }
  const id = pickString(raw, "id", "Id");
  const actorUserId = pickString(raw, "actorUserId", "ActorUserId");
  const tenantId = pickString(raw, "tenantId", "TenantId");
  const action = pickString(raw, "action", "Action");
  const createdAt = pickString(raw, "createdAt", "CreatedAt");
  if (!id || !actorUserId || !tenantId || !action || !createdAt) {
    throw new Error("Invalid audit entry");
  }
  return {
    id,
    actorUserId,
    actorEmail: pickString(raw, "actorEmail", "ActorEmail"),
    tenantId,
    action,
    reason: pickString(raw, "reason", "Reason"),
    createdAt,
  };
}

export async function listPlatformTenants(
  authFetch: AuthFetch,
  options: {
    search?: string;
    status?: string;
    billingStatus?: string;
    hideLoadTest?: boolean;
    page?: number;
    pageSize?: number;
  } = {}
): Promise<TenantListResponse> {
  const params = new URLSearchParams();
  if (options.search?.trim()) {
    params.set("search", options.search.trim());
  }
  if (options.status?.trim()) {
    params.set("status", options.status.trim());
  }
  if (options.billingStatus?.trim()) {
    params.set("billingStatus", options.billingStatus.trim());
  }
  if (options.hideLoadTest) {
    params.set("hideLoadTest", "true");
  }
  params.set("page", String(options.page ?? 1));
  params.set("pageSize", String(options.pageSize ?? 25));

  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/tenants?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = asRecord(await response.json());
  const itemsRaw = raw.items ?? raw.Items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map((item) => parseTenantListItem(asRecord(item)))
    : [];

  return {
    items,
    page: pickNumber(raw, "page", "Page") || 1,
    pageSize: pickNumber(raw, "pageSize", "PageSize") || 25,
    totalCount: pickNumber(raw, "totalCount", "TotalCount"),
  };
}

export type PlatformKpiFreshness =
  | "actual"
  | "missing_instrumentation"
  | "unavailable"
  | "stale";

export type PlatformNamedCount = {
  key: string;
  count: number;
};

export type PlatformKpi<T> = {
  value: T;
  source: string;
  observedAt: string;
  freshness: PlatformKpiFreshness;
};

export type PlatformOpsOverview = {
  tenantStatusCounts: PlatformKpi<PlatformNamedCount[]>;
  billingStatusCounts: PlatformKpi<PlatformNamedCount[]>;
  openSupportCount: PlatformKpi<number>;
  stackHealth: PlatformKpi<string | null>;
};

export const PLATFORM_HEALTH_STATUSES = ["Healthy", "Degraded", "Unhealthy"] as const;
export const PLATFORM_NOT_IN_PROBE_STATUS = "not_in_probe";

export type PlatformMeasuredHealthStatus = (typeof PLATFORM_HEALTH_STATUSES)[number];

export type PlatformHealthCheck = {
  name: string;
  status: string;
  durationMs: number | null;
  description: string | null;
};

export type PlatformOpsHealth = {
  overallStatus: PlatformMeasuredHealthStatus;
  observedAt: string;
  checks: PlatformHealthCheck[];
  notInProbe: PlatformHealthCheck[];
};

export const PLATFORM_OUTBOX_STATUSES = ["Pending", "Processing", "Completed", "Failed"] as const;

export type PlatformOpsOutboxItem = {
  id: string;
  tenantId: string;
  messageType: string;
  status: string;
  attemptCount: number;
  createdAt: string;
  nextAttemptAt: string;
  processedAt: string | null;
  claimedAt: string | null;
  dispatchedAt: string | null;
  lastErrorSanitized: string | null;
};

export type PlatformOpsOutboxList = {
  items: PlatformOpsOutboxItem[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type PlatformOpsOutboxSummary = {
  countsByStatus: PlatformKpi<PlatformNamedCount[]>;
  countsByMessageType: PlatformKpi<PlatformNamedCount[]>;
};

export type PlatformOpsOutboxListQuery = {
  status?: string;
  messageType?: string;
  tenantId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

function parseFreshness(raw: string | null): PlatformKpiFreshness {
  if (
    raw === "actual" ||
    raw === "missing_instrumentation" ||
    raw === "unavailable" ||
    raw === "stale"
  ) {
    return raw;
  }
  throw new Error("Invalid KPI freshness");
}

function parseNamedCounts(raw: unknown): PlatformNamedCount[] {
  if (!Array.isArray(raw)) {
    throw new Error("Invalid named counts");
  }
  return raw.map((item) => {
    const record = asRecord(item);
    const key = pickString(record, "key", "Key");
    const countRaw = record.count ?? record.Count;
    if (
      !key ||
      typeof countRaw !== "number" ||
      !Number.isInteger(countRaw) ||
      countRaw < 0
    ) {
      throw new Error("Invalid named count");
    }
    return { key, count: countRaw };
  });
}

function parseKpiRecord(raw: unknown): Record<string, unknown> {
  const record = asRecord(raw);
  const source = pickString(record, "source", "Source");
  const observedAt = pickString(record, "observedAt", "ObservedAt");
  const freshness = parseFreshness(pickString(record, "freshness", "Freshness"));
  if (!source || !observedAt) {
    throw new Error("Invalid KPI envelope");
  }
  return { ...record, source, observedAt, freshness };
}

export async function getPlatformOpsOverview(
  authFetch: AuthFetch,
  options: { hideLoadTest?: boolean } = {}
): Promise<PlatformOpsOverview> {
  const params = new URLSearchParams();
  params.set("hideLoadTest", options.hideLoadTest === false ? "false" : "true");
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/ops/overview?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = asRecord(await response.json());
  const tenantStatus = parseKpiRecord(raw.tenantStatusCounts ?? raw.TenantStatusCounts);
  const billingStatus = parseKpiRecord(raw.billingStatusCounts ?? raw.BillingStatusCounts);
  const openSupport = parseKpiRecord(raw.openSupportCount ?? raw.OpenSupportCount);
  const stackHealth = parseKpiRecord(raw.stackHealth ?? raw.StackHealth);

  if (tenantStatus.freshness !== "actual" || billingStatus.freshness !== "actual") {
    throw new Error("Invalid tenant KPI freshness");
  }
  if (openSupport.freshness !== "actual") {
    throw new Error("Invalid open support KPI");
  }

  const openValue = openSupport.value ?? openSupport.Value;
  if (typeof openValue !== "number" || !Number.isInteger(openValue) || openValue < 0) {
    throw new Error("Invalid open support KPI");
  }

  const healthSource = stackHealth.source as string;
  if (isFakeHealthCopy(healthSource)) {
    throw new Error("Invalid stack health KPI");
  }
  const stackHealthKpi = parseStackHealthKpi(stackHealth, healthSource);

  return {
    tenantStatusCounts: {
      value: parseNamedCounts(tenantStatus.value ?? tenantStatus.Value),
      source: tenantStatus.source as string,
      observedAt: tenantStatus.observedAt as string,
      freshness: tenantStatus.freshness as PlatformKpiFreshness,
    },
    billingStatusCounts: {
      value: parseNamedCounts(billingStatus.value ?? billingStatus.Value),
      source: billingStatus.source as string,
      observedAt: billingStatus.observedAt as string,
      freshness: billingStatus.freshness as PlatformKpiFreshness,
    },
    openSupportCount: {
      value: openValue,
      source: openSupport.source as string,
      observedAt: openSupport.observedAt as string,
      freshness: openSupport.freshness as PlatformKpiFreshness,
    },
    stackHealth: stackHealthKpi,
  };
}

function parseStackHealthKpi(
  stackHealth: Record<string, unknown>,
  healthSource: string
): PlatformKpi<string | null> {
  const freshness = stackHealth.freshness as PlatformKpiFreshness;
  const healthValue = stackHealth.value ?? stackHealth.Value ?? null;
  if (freshness === "actual") {
    if (
      healthValue !== "Healthy" &&
      healthValue !== "Degraded" &&
      healthValue !== "Unhealthy"
    ) {
      throw new Error("Invalid stack health KPI");
    }
    return {
      value: healthValue,
      source: healthSource,
      observedAt: stackHealth.observedAt as string,
      freshness: "actual",
    };
  }
  if (freshness === "unavailable") {
    if (healthValue != null && healthValue !== "") {
      throw new Error("Invalid stack health KPI");
    }
    return {
      value: null,
      source: healthSource,
      observedAt: stackHealth.observedAt as string,
      freshness: "unavailable",
    };
  }
  throw new Error("Invalid stack health KPI");
}

export type PlatformOpsVersion = {
  gitSha: PlatformKpi<string | null>;
  environmentName: PlatformKpi<string>;
  apiVersion: PlatformKpi<string>;
};

const FULL_GIT_SHA = /^(?:[0-9a-fA-F]{40}|[0-9a-fA-F]{64})$/;

export async function getPlatformOpsVersion(authFetch: AuthFetch): Promise<PlatformOpsVersion> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/platform/ops/version`);
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
  return parsePlatformOpsVersion(await response.json());
}

export function parsePlatformOpsVersion(rawJson: unknown): PlatformOpsVersion {
  const raw = asRecord(rawJson);
  const gitSha = parseKpiRecord(raw.gitSha ?? raw.GitSha);
  const environmentName = parseKpiRecord(raw.environmentName ?? raw.EnvironmentName);
  const apiVersion = parseKpiRecord(raw.apiVersion ?? raw.ApiVersion);

  const gitValueRaw = gitSha.value ?? gitSha.Value;
  const gitValue = gitValueRaw == null || gitValueRaw === "" ? null : String(gitValueRaw);
  if (gitSha.freshness === "actual") {
    if (!gitValue || !FULL_GIT_SHA.test(gitValue)) {
      throw new Error("Invalid instrumented Git SHA");
    }
  } else if (gitSha.freshness === "missing_instrumentation" || gitSha.freshness === "unavailable") {
    if (gitValue) {
      throw new Error("Non-instrumented Git SHA must be empty");
    }
  } else {
    throw new Error("Invalid Git SHA freshness");
  }

  const environment = pickString(environmentName, "value", "Value");
  const version = pickString(apiVersion, "value", "Value");
  if (!environment || environmentName.freshness !== "actual") {
    throw new Error("Invalid environmentName KPI");
  }
  if (version !== "v1" || apiVersion.freshness !== "actual") {
    throw new Error("Invalid apiVersion KPI");
  }

  return {
    gitSha: {
      value: gitSha.freshness === "actual" ? gitValue : null,
      source: gitSha.source as string,
      observedAt: gitSha.observedAt as string,
      freshness: gitSha.freshness as PlatformKpiFreshness,
    },
    environmentName: {
      value: environment,
      source: environmentName.source as string,
      observedAt: environmentName.observedAt as string,
      freshness: "actual",
    },
    apiVersion: {
      value: "v1",
      source: apiVersion.source as string,
      observedAt: apiVersion.observedAt as string,
      freshness: "actual",
    },
  };
}

export async function getPlatformOpsHealth(authFetch: AuthFetch): Promise<PlatformOpsHealth> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/platform/ops/health`);
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
  return parsePlatformOpsHealth(await response.json());
}

export function parsePlatformOpsHealth(rawJson: unknown): PlatformOpsHealth {
  const raw = asRecord(rawJson);
  const overallStatus = pickString(raw, "overallStatus", "OverallStatus");
  const observedAt = pickString(raw, "observedAt", "ObservedAt");
  if (
    overallStatus !== "Healthy" &&
    overallStatus !== "Degraded" &&
    overallStatus !== "Unhealthy"
  ) {
    throw new Error("Invalid health overall status");
  }
  if (!observedAt) {
    throw new Error("Invalid health observedAt");
  }

  const checks = parseHealthChecks(raw.checks ?? raw.Checks, { allowNotInProbe: false });
  const notInProbe = parseHealthChecks(raw.notInProbe ?? raw.NotInProbe, {
    allowNotInProbe: true,
  });
  if (notInProbe.some((check) => check.status !== PLATFORM_NOT_IN_PROBE_STATUS)) {
    throw new Error("Invalid not-in-probe status");
  }
  if (
    notInProbe.some((check) =>
      /\b(healthy|ok|active|operational|unavailable)\b/i.test(check.status)
    )
  ) {
    throw new Error("Invalid not-in-probe status");
  }

  return { overallStatus, observedAt, checks, notInProbe };
}

const OUTBOX_ITEM_MAX_ERROR = 200;
const OUTBOX_DEFAULT_PAGE_SIZE = 25;
const OUTBOX_MAX_PAGE_SIZE = 50;

function parseOutboxNamedCountKpi(raw: unknown): PlatformKpi<PlatformNamedCount[]> {
  const record = parseKpiRecord(raw);
  if (record.freshness !== "actual" && record.freshness !== "unavailable") {
    throw new Error("Invalid outbox KPI freshness");
  }
  if (record.freshness === "unavailable") {
    return {
      value: [],
      source: record.source as string,
      observedAt: record.observedAt as string,
      freshness: "unavailable",
    };
  }
  return {
    value: parseNamedCounts(record.value ?? record.Value),
    source: record.source as string,
    observedAt: record.observedAt as string,
    freshness: "actual",
  };
}

export function parsePlatformOpsOutboxSummary(rawJson: unknown): PlatformOpsOutboxSummary {
  const raw = asRecord(rawJson);
  return {
    countsByStatus: parseOutboxNamedCountKpi(raw.countsByStatus ?? raw.CountsByStatus),
    countsByMessageType: parseOutboxNamedCountKpi(raw.countsByMessageType ?? raw.CountsByMessageType),
  };
}

export function parsePlatformOpsOutboxList(rawJson: unknown): PlatformOpsOutboxList {
  const raw = asRecord(rawJson);
  const itemsRaw = raw.items ?? raw.Items;
  if (!Array.isArray(itemsRaw)) {
    throw new Error("Invalid outbox list");
  }
  const page = pickNumber(raw, "page", "Page");
  const pageSize = pickNumber(raw, "pageSize", "PageSize");
  const totalCount = pickNumber(raw, "totalCount", "TotalCount");
  if (page < 1 || pageSize < 1 || pageSize > OUTBOX_MAX_PAGE_SIZE || totalCount < 0) {
    throw new Error("Invalid outbox pagination");
  }
  return {
    items: itemsRaw.map((item) => parseOutboxItem(asRecord(item))),
    page,
    pageSize,
    totalCount,
  };
}

function parseOutboxItem(raw: Record<string, unknown>): PlatformOpsOutboxItem {
  const id = pickString(raw, "id", "Id");
  const tenantId = pickString(raw, "tenantId", "TenantId");
  const messageType = pickString(raw, "messageType", "MessageType");
  const status = pickString(raw, "status", "Status");
  const createdAt = pickString(raw, "createdAt", "CreatedAt");
  const nextAttemptAt = pickString(raw, "nextAttemptAt", "NextAttemptAt");
  const attemptCount = pickNumber(raw, "attemptCount", "AttemptCount");
  if (!id || !tenantId || !messageType || !status || !createdAt || !nextAttemptAt) {
    throw new Error("Invalid outbox item");
  }
  if (attemptCount < 0) {
    throw new Error("Invalid outbox item");
  }
  const lastErrorSanitized =
    pickString(raw, "lastErrorSanitized", "LastErrorSanitized") ?? null;
  if (lastErrorSanitized && lastErrorSanitized.length > OUTBOX_ITEM_MAX_ERROR) {
    throw new Error("Invalid lastErrorSanitized");
  }
  return {
    id,
    tenantId,
    messageType,
    status,
    attemptCount,
    createdAt,
    nextAttemptAt,
    processedAt: pickString(raw, "processedAt", "ProcessedAt"),
    claimedAt: pickString(raw, "claimedAt", "ClaimedAt"),
    dispatchedAt: pickString(raw, "dispatchedAt", "DispatchedAt"),
    lastErrorSanitized,
  };
}

export async function getPlatformOpsOutboxSummary(
  authFetch: AuthFetch
): Promise<PlatformOpsOutboxSummary> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/platform/ops/outbox/summary`);
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
  return parsePlatformOpsOutboxSummary(await response.json());
}

export const PLATFORM_PADDLE_DISPOSITIONS = [
  "Processed",
  "Duplicate",
  "Ignored",
  "Retryable",
  "Rejected",
] as const;

export type PlatformOpsPaddleDisposition = (typeof PLATFORM_PADDLE_DISPOSITIONS)[number];

export type PlatformOpsPaddleConfig = {
  isConfigured: boolean;
  environment: string;
  allowLive: boolean;
  apiHost: string;
};

export type PlatformOpsPaddleDeliveryItem = {
  id: string;
  eventId: string | null;
  eventType: string | null;
  disposition: string;
  tenantId: string | null;
  httpStatus: number;
  detailSanitized: string | null;
  observedAt: string;
};

export type PlatformOpsPaddleDeliveryList = {
  items: PlatformOpsPaddleDeliveryItem[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type PlatformOpsPaddleDeliveryListQuery = {
  disposition?: string;
  eventType?: string;
  tenantId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

const PADDLE_DEFAULT_PAGE_SIZE = 25;
const PADDLE_MAX_PAGE_SIZE = 50;
const PADDLE_DETAIL_MAX = 200;

export function parsePlatformOpsPaddleConfig(rawJson: unknown): PlatformOpsPaddleConfig {
  const raw = asRecord(rawJson);
  const environment = pickString(raw, "environment", "Environment");
  const apiHost = pickString(raw, "apiHost", "ApiHost");
  const isConfigured = raw.isConfigured ?? raw.IsConfigured;
  const allowLive = raw.allowLive ?? raw.AllowLive;
  if (
    !environment ||
    !apiHost ||
    typeof isConfigured !== "boolean" ||
    typeof allowLive !== "boolean"
  ) {
    throw new Error("Invalid paddle config");
  }
  if (
    "apiKey" in raw ||
    "ApiKey" in raw ||
    "webhookSecret" in raw ||
    "WebhookSecret" in raw ||
    "clientToken" in raw ||
    "ClientToken" in raw
  ) {
    throw new Error("Paddle config leaked a secret field");
  }
  return { isConfigured, environment, allowLive, apiHost };
}

export function parsePlatformOpsPaddleDeliveryList(rawJson: unknown): PlatformOpsPaddleDeliveryList {
  const raw = asRecord(rawJson);
  const itemsRaw = raw.items ?? raw.Items;
  if (!Array.isArray(itemsRaw)) {
    throw new Error("Invalid paddle delivery list");
  }
  const page = pickNumber(raw, "page", "Page");
  const pageSize = pickNumber(raw, "pageSize", "PageSize");
  const totalCount = pickNumber(raw, "totalCount", "TotalCount");
  if (page < 1 || pageSize < 1 || pageSize > PADDLE_MAX_PAGE_SIZE || totalCount < 0) {
    throw new Error("Invalid paddle delivery pagination");
  }
  return {
    items: itemsRaw.map((item) => parsePaddleDeliveryItem(asRecord(item))),
    page,
    pageSize,
    totalCount,
  };
}

function parsePaddleDeliveryItem(raw: Record<string, unknown>): PlatformOpsPaddleDeliveryItem {
  const id = pickString(raw, "id", "Id");
  const disposition = pickString(raw, "disposition", "Disposition");
  const observedAt = pickString(raw, "observedAt", "ObservedAt");
  const httpStatus = pickNumber(raw, "httpStatus", "HttpStatus");
  if (!id || !disposition || !observedAt) {
    throw new Error("Invalid paddle delivery item");
  }
  const detailSanitized = pickString(raw, "detailSanitized", "DetailSanitized");
  if (detailSanitized && detailSanitized.length > PADDLE_DETAIL_MAX) {
    throw new Error("Invalid detailSanitized");
  }
  return {
    id,
    eventId: pickString(raw, "eventId", "EventId"),
    eventType: pickString(raw, "eventType", "EventType"),
    disposition,
    tenantId: pickString(raw, "tenantId", "TenantId"),
    httpStatus,
    detailSanitized,
    observedAt,
  };
}

export async function getPlatformOpsPaddleConfig(
  authFetch: AuthFetch
): Promise<PlatformOpsPaddleConfig> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/platform/ops/paddle/config`);
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
  return parsePlatformOpsPaddleConfig(await response.json());
}

export async function getPlatformOpsPaddleDeliveries(
  authFetch: AuthFetch,
  options: PlatformOpsPaddleDeliveryListQuery = {}
): Promise<PlatformOpsPaddleDeliveryList> {
  const params = new URLSearchParams();
  if (options.disposition?.trim()) {
    params.set("disposition", options.disposition.trim());
  }
  if (options.eventType?.trim()) {
    params.set("eventType", options.eventType.trim());
  }
  if (options.tenantId?.trim()) {
    params.set("tenantId", options.tenantId.trim());
  }
  if (options.from?.trim()) {
    params.set("from", options.from.trim());
  }
  if (options.to?.trim()) {
    params.set("to", options.to.trim());
  }
  params.set("page", String(Math.max(1, options.page ?? 1)));
  const requestedSize = options.pageSize ?? PADDLE_DEFAULT_PAGE_SIZE;
  params.set(
    "pageSize",
    String(Math.min(PADDLE_MAX_PAGE_SIZE, Math.max(1, requestedSize)))
  );

  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/ops/paddle/deliveries?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
  return parsePlatformOpsPaddleDeliveryList(await response.json());
}

export async function getPlatformOpsOutboxList(
  authFetch: AuthFetch,
  options: PlatformOpsOutboxListQuery = {}
): Promise<PlatformOpsOutboxList> {
  const params = new URLSearchParams();
  if (options.status?.trim()) {
    params.set("status", options.status.trim());
  }
  if (options.messageType?.trim()) {
    params.set("messageType", options.messageType.trim());
  }
  if (options.tenantId?.trim()) {
    params.set("tenantId", options.tenantId.trim());
  }
  if (options.from?.trim()) {
    params.set("from", options.from.trim());
  }
  if (options.to?.trim()) {
    params.set("to", options.to.trim());
  }
  params.set("page", String(Math.max(1, options.page ?? 1)));
  const requestedSize = options.pageSize ?? OUTBOX_DEFAULT_PAGE_SIZE;
  params.set(
    "pageSize",
    String(Math.min(OUTBOX_MAX_PAGE_SIZE, Math.max(1, requestedSize)))
  );

  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/ops/outbox?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
  return parsePlatformOpsOutboxList(await response.json());
}

function parseHealthChecks(
  raw: unknown,
  options: { allowNotInProbe: boolean }
): PlatformHealthCheck[] {
  if (!Array.isArray(raw)) {
    throw new Error("Invalid health checks");
  }
  return raw.map((item) => {
    const record = asRecord(item);
    const name = pickString(record, "name", "Name");
    const status = pickString(record, "status", "Status");
    const descriptionRaw = record.description ?? record.Description;
    if (!name || !status) {
      throw new Error("Invalid health check");
    }
    const allowed: string[] = options.allowNotInProbe
      ? [PLATFORM_NOT_IN_PROBE_STATUS]
      : [...PLATFORM_HEALTH_STATUSES];
    if (!allowed.includes(status)) {
      throw new Error("Invalid health check status");
    }
    const durationRaw = record.durationMs ?? record.DurationMs;
    let durationMs: number | null = null;
    if (durationRaw != null && durationRaw !== "") {
      if (typeof durationRaw !== "number" || !Number.isFinite(durationRaw) || durationRaw < 0) {
        throw new Error("Invalid health duration");
      }
      durationMs = durationRaw;
    }
    if (options.allowNotInProbe) {
      durationMs = null;
    }
    const description =
      typeof descriptionRaw === "string" && descriptionRaw.trim().length > 0
        ? descriptionRaw
        : null;
    if (description && /(Password=|Host=|redis:\/\/|rediss:\/\/|Bearer |ApiKey|StackTrace)/i.test(description)) {
      throw new Error("Invalid health description");
    }
    return { name, status, durationMs, description };
  });
}

export const PLATFORM_AUDIT_ACTIONS = [
  "TenantCreated",
  "TenantSuspended",
  "TenantReactivated",
  "TenantArchived",
  "ComplimentarySet",
  "ComplimentaryCleared",
  "SupportIssueReplyAdded",
  "PasswordResetSent",
  "EmailVerificationResent",
  "SupportIssueSeverityChanged",
] as const;

export type PlatformAuditListResponse = {
  items: PlatformAuditEntry[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type PlatformAuditSearchFilters = {
  action?: string;
  tenantId?: string;
  actorEmail?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

function appendAuditFilters(params: URLSearchParams, filters: PlatformAuditSearchFilters) {
  if (filters.action?.trim()) {
    params.set("action", filters.action.trim());
  }
  if (filters.tenantId?.trim()) {
    params.set("tenantId", filters.tenantId.trim());
  }
  if (filters.actorEmail?.trim()) {
    params.set("actorEmail", filters.actorEmail.trim());
  }
  if (filters.from?.trim()) {
    params.set("from", filters.from.trim());
  }
  if (filters.to?.trim()) {
    params.set("to", filters.to.trim());
  }
}

export async function listPlatformAudits(
  authFetch: AuthFetch,
  filters: PlatformAuditSearchFilters = {}
): Promise<PlatformAuditListResponse> {
  const params = new URLSearchParams();
  appendAuditFilters(params, filters);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 25));

  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/audits?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = asRecord(await response.json());
  const itemsRaw = raw.items ?? raw.Items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map((item) => parseAudit(asRecord(item)))
    : [];

  return {
    items,
    page: pickNumber(raw, "page", "Page") || 1,
    pageSize: pickNumber(raw, "pageSize", "PageSize") || 25,
    totalCount: pickNumber(raw, "totalCount", "TotalCount"),
  };
}

export async function exportPlatformAudits(
  authFetch: AuthFetch,
  filters: PlatformAuditSearchFilters = {}
): Promise<Blob> {
  const params = new URLSearchParams();
  appendAuditFilters(params, filters);
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/audits/export?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
  return response.blob();
}

export async function getPlatformTenant(
  authFetch: AuthFetch,
  tenantId: string
): Promise<TenantDetailResponse> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/tenants/${tenantId}`
  );
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = asRecord(await response.json());
  const tenantRaw = asRecord(raw.tenant ?? raw.Tenant);
  const auditsRaw = raw.recentAudits ?? raw.RecentAudits;
  return {
    tenant: parseTenant(tenantRaw),
    recentAudits: Array.isArray(auditsRaw)
      ? auditsRaw.map((entry) => parseAudit(asRecord(entry)))
      : [],
  };
}

export async function getPlatformTenantTimeline(
  authFetch: AuthFetch,
  tenantId: string
): Promise<PlatformTenantTimelineResponse> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/tenants/${tenantId}/timeline`
  );
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
  return parseTimeline(asRecord(await response.json()));
}

function parseTimeline(raw: Record<string, unknown>): PlatformTenantTimelineResponse {
  const tenantId = pickString(raw, "tenantId", "TenantId");
  const observedAt = pickString(raw, "observedAt", "ObservedAt");
  if (!tenantId || !observedAt) {
    throw new Error("Invalid tenant timeline");
  }
  const itemsRaw = raw.items ?? raw.Items;
  const sourcesRaw = raw.sources ?? raw.Sources;
  return {
    tenantId,
    observedAt,
    hasHistoricalEvents: pickBoolean(raw, "hasHistoricalEvents", "HasHistoricalEvents"),
    items: Array.isArray(itemsRaw) ? itemsRaw.map((item) => parseTimelineItem(asRecord(item))) : [],
    sources: Array.isArray(sourcesRaw)
      ? sourcesRaw.map((source) => parseTimelineSource(asRecord(source)))
      : [],
  };
}

function parseTimelineItem(raw: Record<string, unknown>): PlatformTenantTimelineItem {
  const id = pickString(raw, "id", "Id");
  const type = pickString(raw, "type", "Type");
  const timestamp = pickString(raw, "timestamp", "Timestamp");
  const provenance = pickString(raw, "provenance", "Provenance");
  const summary = pickString(raw, "summary", "Summary");
  if (!id || !type || !timestamp || !provenance || !summary) {
    throw new Error("Invalid timeline item");
  }
  if (!PLATFORM_TIMELINE_TYPES.includes(type as PlatformTenantTimelineType)) {
    throw new Error("Invalid timeline type");
  }
  const metadataRaw = raw.metadata ?? raw.Metadata;
  const metadata: Record<string, string | null> = {};
  if (metadataRaw && typeof metadataRaw === "object" && !Array.isArray(metadataRaw)) {
    for (const [key, value] of Object.entries(metadataRaw as Record<string, unknown>)) {
      metadata[key] = typeof value === "string" ? value : value == null ? null : String(value);
    }
  }
  return {
    id,
    type: type as PlatformTenantTimelineType,
    timestamp,
    provenance,
    summary,
    metadata,
  };
}

function parseTimelineSource(raw: Record<string, unknown>): PlatformTenantTimelineSource {
  const source = pickString(raw, "source", "Source");
  const state = pickString(raw, "state", "State");
  if (!source || !state) {
    throw new Error("Invalid timeline source");
  }
  if (state !== "present" && state !== "empty" && state !== "missing_instrumentation") {
    throw new Error("Invalid timeline source state");
  }
  return {
    source,
    state,
    itemCount: pickNumber(raw, "itemCount", "ItemCount"),
  };
}

export async function suspendPlatformTenant(
  authFetch: AuthFetch,
  tenantId: string,
  reason: string
): Promise<TenantResponse> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/tenants/${tenantId}/suspend`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }
  );
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
  return parseTenant(asRecord(await response.json()));
}

export async function reactivatePlatformTenant(
  authFetch: AuthFetch,
  tenantId: string
): Promise<TenantResponse> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/tenants/${tenantId}/reactivate`,
    { method: "POST" }
  );
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
  return parseTenant(asRecord(await response.json()));
}

export async function archivePlatformTenant(
  authFetch: AuthFetch,
  tenantId: string
): Promise<TenantResponse> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/tenants/${tenantId}/archive`,
    { method: "POST" }
  );
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
  return parseTenant(asRecord(await response.json()));
}

export async function setPlatformTenantComplimentary(
  authFetch: AuthFetch,
  tenantId: string,
  body: { isComplimentary: boolean; plan?: string; reason?: string }
): Promise<TenantResponse> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/tenants/${tenantId}/complimentary`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isComplimentary: body.isComplimentary,
        plan: body.plan,
        reason: body.reason,
      }),
    }
  );
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
  return parseTenant(asRecord(await response.json()));
}

export type PlatformSupportIssueListItem = {
  id: string;
  issueNumber: string;
  tenantSlug: string;
  operatorEmail: string;
  subject: string;
  status: string;
  severity: string;
  createdAt: string;
};

export type PlatformSupportIssueListResponse = {
  items: PlatformSupportIssueListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type PlatformSupportAttachment = {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
};

export async function createPlatformTenant(
  authFetch: AuthFetch,
  body: {
    name: string;
    slug: string;
    plan?: string;
    adminContactEmail: string;
    isComplimentary?: boolean;
  }
): Promise<TenantResponse> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/platform/tenants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: body.name,
      slug: body.slug,
      plan: body.plan ?? "Basic",
      adminContactEmail: body.adminContactEmail,
      isComplimentary: body.isComplimentary ?? false,
    }),
  });
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
  return parseTenant(asRecord(await response.json()));
}

export type PlatformLimitMeter = { used: number; max: number };

export type PlatformTenantSnapshot = {
  tenantId: string;
  slug: string;
  name: string;
  plan: string;
  status: string;
  billingStatus: string;
  isComplimentary: boolean;
  seats: PlatformLimitMeter;
  communities: PlatformLimitMeter;
  publishedActivities: PlatformLimitMeter;
  registrationsThisMonth: PlatformLimitMeter;
  lastActivityAt: string | null;
  openIssueCount: number;
  isDemoOrLoadTest: boolean;
  members: Array<{ email: string; role: string }>;
};

export type PlatformTenantMember = {
  userId: string;
  email: string;
  role: string;
  emailVerified: boolean;
};

export type PlatformTenantOpenIssue = {
  id: string;
  issueNumber: string;
  subject: string;
  status: string;
  createdAt: string;
};

export type PlatformSupportReply = {
  id: string;
  body: string;
  actorEmail: string | null;
  createdAt: string;
};

export type PlatformOmniSearchResult = {
  tenants: Array<{ id: string; slug: string; name: string; status: string; plan: string }>;
  issues: Array<{
    id: string;
    issueNumber: string;
    tenantSlug: string;
    subject: string;
    status: string;
  }>;
};

function parseLimitMeter(raw: Record<string, unknown>): PlatformLimitMeter {
  return {
    used: pickNumber(raw, "used", "Used"),
    max: pickNumber(raw, "max", "Max"),
  };
}

function parseSnapshot(raw: Record<string, unknown>): PlatformTenantSnapshot {
  const tenantId = pickString(raw, "tenantId", "TenantId");
  const slug = pickString(raw, "slug", "Slug");
  const name = pickString(raw, "name", "Name");
  const plan = pickString(raw, "plan", "Plan");
  const status = pickString(raw, "status", "Status");
  const billingStatus = pickString(raw, "billingStatus", "BillingStatus");
  if (!tenantId || !slug || !name || !plan || !status || !billingStatus) {
    throw new Error("Invalid tenant snapshot");
  }
  const membersRaw = raw.members ?? raw.Members;
  return {
    tenantId,
    slug,
    name,
    plan,
    status,
    billingStatus,
    isComplimentary: pickBoolean(raw, "isComplimentary", "IsComplimentary"),
    seats: parseLimitMeter(asRecord(raw.seats ?? raw.Seats)),
    communities: parseLimitMeter(asRecord(raw.communities ?? raw.Communities)),
    publishedActivities: parseLimitMeter(
      asRecord(raw.publishedActivities ?? raw.PublishedActivities)
    ),
    registrationsThisMonth: parseLimitMeter(
      asRecord(raw.registrationsThisMonth ?? raw.RegistrationsThisMonth)
    ),
    lastActivityAt: pickString(raw, "lastActivityAt", "LastActivityAt"),
    openIssueCount: pickNumber(raw, "openIssueCount", "OpenIssueCount"),
    isDemoOrLoadTest: pickBoolean(raw, "isDemoOrLoadTest", "IsDemoOrLoadTest"),
    members: Array.isArray(membersRaw)
      ? membersRaw.map((item) => {
          const row = asRecord(item);
          return {
            email: pickString(row, "email", "Email") ?? "",
            role: pickString(row, "role", "Role") ?? "",
          };
        })
      : [],
  };
}

export async function getPlatformTenantSnapshot(
  authFetch: AuthFetch,
  tenantId: string
): Promise<PlatformTenantSnapshot> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/tenants/${tenantId}/snapshot`
  );
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
  return parseSnapshot(asRecord(await response.json()));
}

export async function listPlatformTenantMembers(
  authFetch: AuthFetch,
  tenantId: string
): Promise<PlatformTenantMember[]> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/tenants/${tenantId}/members`
  );
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
  const raw = await response.json();
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item) => {
    const row = asRecord(item);
    return {
      userId: pickString(row, "userId", "UserId") ?? "",
      email: pickString(row, "email", "Email") ?? "",
      role: pickString(row, "role", "Role") ?? "",
      emailVerified: pickBoolean(row, "emailVerified", "EmailVerified"),
    };
  });
}

export async function listPlatformTenantOpenIssues(
  authFetch: AuthFetch,
  tenantId: string
): Promise<PlatformTenantOpenIssue[]> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/tenants/${tenantId}/open-issues`
  );
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
  const raw = await response.json();
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item) => {
    const row = asRecord(item);
    return {
      id: pickString(row, "id", "Id") ?? "",
      issueNumber: pickString(row, "issueNumber", "IssueNumber") ?? "",
      subject: pickString(row, "subject", "Subject") ?? "",
      status: pickString(row, "status", "Status") ?? "",
      createdAt: pickString(row, "createdAt", "CreatedAt") ?? "",
    };
  });
}

export async function sendPlatformPasswordReset(
  authFetch: AuthFetch,
  tenantId: string,
  memberUserId: string
): Promise<string> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/tenants/${tenantId}/members/${memberUserId}/send-password-reset`,
    { method: "POST" }
  );
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
  const raw = asRecord(await response.json());
  return pickString(raw, "message", "Message") ?? "Reset email sent.";
}

export async function resendPlatformEmailVerification(
  authFetch: AuthFetch,
  tenantId: string,
  memberUserId: string
): Promise<string> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/tenants/${tenantId}/members/${memberUserId}/resend-email-verification`,
    { method: "POST" }
  );
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
  const raw = asRecord(await response.json());
  return pickString(raw, "message", "Message") ?? "Verification email sent.";
}

export async function platformOmniSearch(
  authFetch: AuthFetch,
  query: string
): Promise<PlatformOmniSearchResult> {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set("q", query.trim());
  }
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/search?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
  const raw = asRecord(await response.json());
  const tenantsRaw = raw.tenants ?? raw.Tenants;
  const issuesRaw = raw.issues ?? raw.Issues;
  return {
    tenants: Array.isArray(tenantsRaw)
      ? tenantsRaw.map((item) => {
          const row = asRecord(item);
          return {
            id: pickString(row, "id", "Id") ?? "",
            slug: pickString(row, "slug", "Slug") ?? "",
            name: pickString(row, "name", "Name") ?? "",
            status: pickString(row, "status", "Status") ?? "",
            plan: pickString(row, "plan", "Plan") ?? "",
          };
        })
      : [],
    issues: Array.isArray(issuesRaw)
      ? issuesRaw.map((item) => {
          const row = asRecord(item);
          return {
            id: pickString(row, "id", "Id") ?? "",
            issueNumber: pickString(row, "issueNumber", "IssueNumber") ?? "",
            tenantSlug: pickString(row, "tenantSlug", "TenantSlug") ?? "",
            subject: pickString(row, "subject", "Subject") ?? "",
            status: pickString(row, "status", "Status") ?? "",
          };
        })
      : [],
  };
}

export async function getPlatformSupportOpenCount(authFetch: AuthFetch): Promise<number> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/support-issues/open-count`
  );
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
  const raw = asRecord(await response.json());
  return pickNumber(raw, "count", "Count");
}

export type PlatformSupportIssueDetail = {
  id: string;
  issueNumber: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  plan: string;
  operatorEmail: string;
  operatorDisplayName: string;
  subject: string;
  description: string;
  status: string;
  severity: string;
  userAgent: string | null;
  internalNote: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: PlatformSupportAttachment[];
  replies: PlatformSupportReply[];
};

export type PlatformSupportReportPreset = "weekly" | "monthly" | "custom";

export type PlatformSupportReportPeriod = {
  preset: string;
  startAt: string;
  endAt: string;
  computedAt: string;
};

export type PlatformSupportReport = {
  period: PlatformSupportReportPeriod;
  openedInPeriod: number;
  resolvedOrClosedInPeriod: number;
  stillOpen: number;
  countsByStatus: Array<{ status: string; count: number }>;
  topTenants: Array<{ tenantSlug: string; tenantName: string; count: number }>;
  dailyOpenedTrend: Array<{ date: string; openedCount: number }>;
};

export const PLATFORM_SUPPORT_STATUSES = [
  "Open",
  "InProgress",
  "WaitingOnOperator",
  "Resolved",
  "Closed",
] as const;

export const PLATFORM_SUPPORT_SEVERITIES = [
  "Unspecified",
  "Low",
  "Medium",
  "High",
  "Critical",
] as const;

function parseSupportListItem(raw: Record<string, unknown>): PlatformSupportIssueListItem {
  const id = pickString(raw, "id", "Id");
  const issueNumber = pickString(raw, "issueNumber", "IssueNumber");
  const tenantSlug = pickString(raw, "tenantSlug", "TenantSlug");
  const operatorEmail = pickString(raw, "operatorEmail", "OperatorEmail");
  const subject = pickString(raw, "subject", "Subject");
  const status = pickString(raw, "status", "Status");
  const severity = pickString(raw, "severity", "Severity");
  const createdAt = pickString(raw, "createdAt", "CreatedAt");
  if (!id || !issueNumber || !tenantSlug || !operatorEmail || !subject || !status || !severity || !createdAt) {
    throw new Error("Invalid support issue list item");
  }
  if (!PLATFORM_SUPPORT_SEVERITIES.includes(severity as (typeof PLATFORM_SUPPORT_SEVERITIES)[number])) {
    throw new Error("Invalid support issue severity");
  }
  return { id, issueNumber, tenantSlug, operatorEmail, subject, status, severity, createdAt };
}

function parseSupportAttachment(raw: Record<string, unknown>): PlatformSupportAttachment {
  const id = pickString(raw, "id", "Id");
  const fileName = pickString(raw, "fileName", "FileName");
  const contentType = pickString(raw, "contentType", "ContentType");
  const createdAt = pickString(raw, "createdAt", "CreatedAt");
  if (!id || !fileName || !contentType || !createdAt) {
    throw new Error("Invalid support attachment");
  }
  return {
    id,
    fileName,
    contentType,
    sizeBytes: pickNumber(raw, "sizeBytes", "SizeBytes"),
    createdAt,
  };
}

function parseSupportDetail(raw: Record<string, unknown>): PlatformSupportIssueDetail {
  const id = pickString(raw, "id", "Id");
  const issueNumber = pickString(raw, "issueNumber", "IssueNumber");
  const tenantId = pickString(raw, "tenantId", "TenantId");
  const tenantSlug = pickString(raw, "tenantSlug", "TenantSlug");
  const tenantName = pickString(raw, "tenantName", "TenantName");
  const plan = pickString(raw, "plan", "Plan");
  const operatorEmail = pickString(raw, "operatorEmail", "OperatorEmail");
  const operatorDisplayName = pickString(raw, "operatorDisplayName", "OperatorDisplayName");
  const subject = pickString(raw, "subject", "Subject");
  const description = pickString(raw, "description", "Description");
  const status = pickString(raw, "status", "Status");
  const severity = pickString(raw, "severity", "Severity");
  const createdAt = pickString(raw, "createdAt", "CreatedAt");
  const updatedAt = pickString(raw, "updatedAt", "UpdatedAt");
  if (
    !id ||
    !issueNumber ||
    !tenantId ||
    !tenantSlug ||
    !tenantName ||
    !plan ||
    !operatorEmail ||
    !operatorDisplayName ||
    !subject ||
    !description ||
    !status ||
    !severity ||
    !createdAt ||
    !updatedAt
  ) {
    throw new Error("Invalid support issue detail");
  }
  if (!PLATFORM_SUPPORT_SEVERITIES.includes(severity as (typeof PLATFORM_SUPPORT_SEVERITIES)[number])) {
    throw new Error("Invalid support issue severity");
  }

  const attachmentsRaw = raw.attachments ?? raw.Attachments;
  const repliesRaw = raw.replies ?? raw.Replies;
  return {
    id,
    issueNumber,
    tenantId,
    tenantSlug,
    tenantName,
    plan,
    operatorEmail,
    operatorDisplayName,
    subject,
    description,
    status,
    severity,
    userAgent: pickString(raw, "userAgent", "UserAgent"),
    internalNote: pickString(raw, "internalNote", "InternalNote"),
    createdAt,
    updatedAt,
    attachments: Array.isArray(attachmentsRaw)
      ? attachmentsRaw.map((item) => parseSupportAttachment(asRecord(item)))
      : [],
    replies: Array.isArray(repliesRaw)
      ? repliesRaw.map((item) => {
          const row = asRecord(item);
          return {
            id: pickString(row, "id", "Id") ?? "",
            body: pickString(row, "body", "Body") ?? "",
            actorEmail: pickString(row, "actorEmail", "ActorEmail"),
            createdAt: pickString(row, "createdAt", "CreatedAt") ?? "",
          };
        })
      : [],
  };
}

function parseSupportReport(raw: Record<string, unknown>): PlatformSupportReport {
  const periodRaw = asRecord(raw.period ?? raw.Period);
  const preset = pickString(periodRaw, "preset", "Preset");
  const startAt = pickString(periodRaw, "startAt", "StartAt");
  const endAt = pickString(periodRaw, "endAt", "EndAt");
  const computedAt = pickString(periodRaw, "computedAt", "ComputedAt");
  if (!preset || !startAt || !endAt || !computedAt) {
    throw new Error("Invalid support report period");
  }

  const countsRaw = raw.countsByStatus ?? raw.CountsByStatus;
  const topTenantsRaw = raw.topTenants ?? raw.TopTenants;
  const trendRaw = raw.dailyOpenedTrend ?? raw.DailyOpenedTrend;

  return {
    period: { preset, startAt, endAt, computedAt },
    openedInPeriod: pickNumber(raw, "openedInPeriod", "OpenedInPeriod"),
    resolvedOrClosedInPeriod: pickNumber(
      raw,
      "resolvedOrClosedInPeriod",
      "ResolvedOrClosedInPeriod"
    ),
    stillOpen: pickNumber(raw, "stillOpen", "StillOpen"),
    countsByStatus: Array.isArray(countsRaw)
      ? countsRaw.map((item) => {
          const row = asRecord(item);
          return {
            status: pickString(row, "status", "Status") ?? "Unknown",
            count: pickNumber(row, "count", "Count"),
          };
        })
      : [],
    topTenants: Array.isArray(topTenantsRaw)
      ? topTenantsRaw.map((item) => {
          const row = asRecord(item);
          return {
            tenantSlug: pickString(row, "tenantSlug", "TenantSlug") ?? "",
            tenantName: pickString(row, "tenantName", "TenantName") ?? "",
            count: pickNumber(row, "count", "Count"),
          };
        })
      : [],
    dailyOpenedTrend: Array.isArray(trendRaw)
      ? trendRaw.map((item) => {
          const row = asRecord(item);
          return {
            date: pickString(row, "date", "Date") ?? "",
            openedCount: pickNumber(row, "openedCount", "OpenedCount"),
          };
        })
      : [],
  };
}

function buildSupportReportParams(options: {
  preset: PlatformSupportReportPreset;
  from?: string;
  to?: string;
}): URLSearchParams {
  const params = new URLSearchParams();
  params.set("preset", options.preset);
  if (options.preset === "custom") {
    if (options.from) {
      params.set("from", options.from);
    }
    if (options.to) {
      params.set("to", options.to);
    }
  }
  return params;
}

export async function listPlatformSupportIssues(
  authFetch: AuthFetch,
  options: { search?: string; status?: string; severity?: string; page?: number; pageSize?: number } = {}
): Promise<PlatformSupportIssueListResponse> {
  const params = new URLSearchParams();
  if (options.search?.trim()) {
    params.set("search", options.search.trim());
  }
  if (options.status?.trim()) {
    params.set("status", options.status.trim());
  }
  if (options.severity?.trim()) {
    params.set("severity", options.severity.trim());
  }
  params.set("page", String(options.page ?? 1));
  params.set("pageSize", String(options.pageSize ?? 25));

  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/support-issues?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = asRecord(await response.json());
  const itemsRaw = raw.items ?? raw.Items;
  return {
    items: Array.isArray(itemsRaw)
      ? itemsRaw.map((item) => parseSupportListItem(asRecord(item)))
      : [],
    page: pickNumber(raw, "page", "Page") || 1,
    pageSize: pickNumber(raw, "pageSize", "PageSize") || 25,
    totalCount: pickNumber(raw, "totalCount", "TotalCount"),
  };
}

export async function getPlatformSupportIssue(
  authFetch: AuthFetch,
  issueId: string
): Promise<PlatformSupportIssueDetail> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/support-issues/${issueId}`
  );
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
  return parseSupportDetail(asRecord(await response.json()));
}

export async function updatePlatformSupportIssue(
  authFetch: AuthFetch,
  issueId: string,
  body: { status?: string; internalNote?: string | null; severity?: string }
): Promise<PlatformSupportIssueDetail> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/support-issues/${issueId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: body.status,
        internalNote: body.internalNote,
        severity: body.severity,
      }),
    }
  );
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
  return parseSupportDetail(asRecord(await response.json()));
}

export async function addPlatformSupportReply(
  authFetch: AuthFetch,
  issueId: string,
  body: string
): Promise<PlatformSupportIssueDetail> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/support-issues/${issueId}/replies`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }
  );
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
  return parseSupportDetail(asRecord(await response.json()));
}

export function platformSupportAttachmentUrl(issueId: string, attachmentId: string): string {
  return `${getPublicApiBaseUrl()}/api/v1/platform/support-issues/${issueId}/attachments/${attachmentId}`;
}

export async function getPlatformSupportReport(
  authFetch: AuthFetch,
  options: { preset: PlatformSupportReportPreset; from?: string; to?: string }
): Promise<PlatformSupportReport> {
  const params = buildSupportReportParams(options);
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/reports/support?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
  return parseSupportReport(asRecord(await response.json()));
}

export async function exportPlatformSupportReportCsv(
  authFetch: AuthFetch,
  options: { preset: PlatformSupportReportPreset; from?: string; to?: string }
): Promise<{ blob: Blob; fileName: string }> {
  const params = buildSupportReportParams(options);
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/reports/support/export?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const fileName = match?.[1] ?? "support-report.csv";
  return { blob, fileName };
}

/** Convenience when a component does not already have authFetch from context. */
export function platformAuthFetch(
  onSessionExpired?: () => void
): AuthFetch {
  return (input, init) => fetchWithAuth(input, init ?? {}, onSessionExpired);
}
