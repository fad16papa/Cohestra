import { getPublicApiBaseUrl } from "@/lib/api";
import {
  parseClientListItem,
  type ClientListItem,
  type ClientListResult,
} from "@/lib/clients-api";

export type CommunityListItem = {
  id: string;
  name: string;
  activityCount: number;
  leadCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CommunityDetail = CommunityListItem;

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

function parseCommunity(raw: Record<string, unknown>): CommunityListItem {
  const id = raw.id ?? raw.Id;
  const name = raw.name ?? raw.Name;
  const activityCount = raw.activityCount ?? raw.ActivityCount;
  const leadCount = raw.leadCount ?? raw.LeadCount;
  const createdAt = raw.createdAt ?? raw.CreatedAt;
  const updatedAt = raw.updatedAt ?? raw.UpdatedAt;

  if (
    typeof id !== "string" ||
    typeof name !== "string" ||
    typeof activityCount !== "number" ||
    typeof leadCount !== "number" ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string"
  ) {
    throw new Error("Invalid community payload");
  }

  return { id, name, activityCount, leadCount, createdAt, updatedAt };
}

export async function fetchCommunities(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<CommunityListItem[]> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/communities`);

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const items = raw.items ?? raw.Items;

  if (!Array.isArray(items)) {
    throw new Error("Invalid communities list payload");
  }

  return items.map((item) => parseCommunity(item as Record<string, unknown>));
}

export async function fetchCommunityById(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string
): Promise<CommunityDetail> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/communities/${id}`);

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  return parseCommunity((await response.json()) as Record<string, unknown>);
}

export async function createCommunity(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  name: string
): Promise<CommunityDetail> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/communities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  return parseCommunity((await response.json()) as Record<string, unknown>);
}

export async function updateCommunity(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string,
  name: string
): Promise<CommunityDetail> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/communities/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  return parseCommunity((await response.json()) as Record<string, unknown>);
}

export async function deleteCommunity(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string
): Promise<void> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/communities/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
}

export async function fetchCommunityClients(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  communityId: string,
  options: {
    page?: number;
    pageSize?: number;
    search?: string;
    leadStatus?: string;
    sortBy?: string;
    sortDirection?: string;
  } = {}
): Promise<ClientListResult> {
  const params = new URLSearchParams();
  params.set("page", String(options.page ?? 1));
  params.set("pageSize", String(options.pageSize ?? 25));

  if (options.search?.trim()) {
    params.set("search", options.search.trim());
  }

  if (options.leadStatus?.trim()) {
    params.set("leadStatus", options.leadStatus.trim());
  }

  if (options.sortBy?.trim()) {
    params.set("sortBy", options.sortBy.trim());
  }

  if (options.sortDirection?.trim()) {
    params.set("sortDirection", options.sortDirection.trim());
  }

  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/communities/${communityId}/clients?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const items = raw.items ?? raw.Items;
  const page = raw.page ?? raw.Page;
  const pageSize = raw.pageSize ?? raw.PageSize;
  const totalCount = raw.totalCount ?? raw.TotalCount;

  if (
    !Array.isArray(items) ||
    typeof page !== "number" ||
    typeof pageSize !== "number" ||
    typeof totalCount !== "number"
  ) {
    throw new Error("Invalid community clients payload");
  }

  return {
    items: items.map((item) => parseClientListItem(item as Record<string, unknown>)),
    page,
    pageSize,
    totalCount,
  };
}

export type { ClientListItem };
