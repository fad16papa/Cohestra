import { fetchWithAuth } from "@/lib/auth-api";
import { getPublicApiBaseUrl } from "@/lib/api";

export type TenantListItem = {
  id: string;
  slug: string;
  name: string;
  plan: string;
  status: string;
  billingStatus: string;
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
  adminContactEmail: string | null;
  suspendedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlatformAuditEntry = {
  id: string;
  actorUserId: string;
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
    tenantId,
    action,
    reason: pickString(raw, "reason", "Reason"),
    createdAt,
  };
}

export async function listPlatformTenants(
  authFetch: AuthFetch,
  options: { search?: string; page?: number; pageSize?: number } = {}
): Promise<TenantListResponse> {
  const params = new URLSearchParams();
  if (options.search?.trim()) {
    params.set("search", options.search.trim());
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

/** Convenience when a component does not already have authFetch from context. */
export function platformAuthFetch(
  onSessionExpired?: () => void
): AuthFetch {
  return (input, init) => fetchWithAuth(input, init ?? {}, onSessionExpired);
}
