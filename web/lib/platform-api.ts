import { fetchWithAuth } from "@/lib/auth-api";
import { getPublicApiBaseUrl } from "@/lib/api";

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

function parseSupportListItem(raw: Record<string, unknown>): PlatformSupportIssueListItem {
  const id = pickString(raw, "id", "Id");
  const issueNumber = pickString(raw, "issueNumber", "IssueNumber");
  const tenantSlug = pickString(raw, "tenantSlug", "TenantSlug");
  const operatorEmail = pickString(raw, "operatorEmail", "OperatorEmail");
  const subject = pickString(raw, "subject", "Subject");
  const status = pickString(raw, "status", "Status");
  const createdAt = pickString(raw, "createdAt", "CreatedAt");
  if (!id || !issueNumber || !tenantSlug || !operatorEmail || !subject || !status || !createdAt) {
    throw new Error("Invalid support issue list item");
  }
  return { id, issueNumber, tenantSlug, operatorEmail, subject, status, createdAt };
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
    !createdAt ||
    !updatedAt
  ) {
    throw new Error("Invalid support issue detail");
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
  options: { search?: string; status?: string; page?: number; pageSize?: number } = {}
): Promise<PlatformSupportIssueListResponse> {
  const params = new URLSearchParams();
  if (options.search?.trim()) {
    params.set("search", options.search.trim());
  }
  if (options.status?.trim()) {
    params.set("status", options.status.trim());
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
  body: { status?: string; internalNote?: string | null }
): Promise<PlatformSupportIssueDetail> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/platform/support-issues/${issueId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: body.status,
        internalNote: body.internalNote,
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
