import { getPublicApiBaseUrl } from "@/lib/api";
import {
  parseClientList,
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

export type CommunityDetail = CommunityListItem & {
  logoAssetId: string | null;
  accentColor: string | null;
  defaultHeroImageUrl: string | null;
  defaultFormTemplateId: string | null;
  defaultFormTemplateName: string | null;
};

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

function parseCommunityDetail(raw: Record<string, unknown>): CommunityDetail {
  const base = parseCommunity(raw);
  const logoAssetId = raw.logoAssetId ?? raw.LogoAssetId;
  const accentColor = raw.accentColor ?? raw.AccentColor;
  const defaultHeroImageUrl = raw.defaultHeroImageUrl ?? raw.DefaultHeroImageUrl;
  const defaultFormTemplateId = raw.defaultFormTemplateId ?? raw.DefaultFormTemplateId;
  const defaultFormTemplateName =
    raw.defaultFormTemplateName ?? raw.DefaultFormTemplateName;

  return {
    ...base,
    logoAssetId:
      logoAssetId === null || logoAssetId === undefined
        ? null
        : typeof logoAssetId === "string"
          ? logoAssetId
          : null,
    accentColor:
      accentColor === null || accentColor === undefined
        ? null
        : typeof accentColor === "string"
          ? accentColor
          : null,
    defaultHeroImageUrl:
      defaultHeroImageUrl === null || defaultHeroImageUrl === undefined
        ? null
        : typeof defaultHeroImageUrl === "string"
          ? defaultHeroImageUrl
          : null,
    defaultFormTemplateId:
      defaultFormTemplateId === null || defaultFormTemplateId === undefined
        ? null
        : typeof defaultFormTemplateId === "string"
          ? defaultFormTemplateId
          : null,
    defaultFormTemplateName:
      defaultFormTemplateName === null || defaultFormTemplateName === undefined
        ? null
        : typeof defaultFormTemplateName === "string"
          ? defaultFormTemplateName
          : null,
  };
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

  return parseCommunityDetail((await response.json()) as Record<string, unknown>);
}

export type UpdateCommunityPayload = {
  name: string;
  brandKitIncluded?: boolean;
  logoAssetId?: string | null;
  accentColor?: string | null;
  defaultHeroImageUrl?: string | null;
};

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

  return parseCommunityDetail((await response.json()) as Record<string, unknown>);
}

export async function updateCommunity(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string,
  payload: UpdateCommunityPayload
): Promise<CommunityDetail> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/communities/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: payload.name,
      ...(payload.brandKitIncluded ? { brandKitIncluded: true } : {}),
      ...(payload.logoAssetId !== undefined ? { logoAssetId: payload.logoAssetId } : {}),
      ...(payload.accentColor !== undefined ? { accentColor: payload.accentColor } : {}),
      ...(payload.defaultHeroImageUrl !== undefined
        ? { defaultHeroImageUrl: payload.defaultHeroImageUrl }
        : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  return parseCommunityDetail((await response.json()) as Record<string, unknown>);
}

export async function setCommunityDefaultFormTemplate(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  communityId: string,
  formTemplateId: string | null
): Promise<CommunityDetail> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/communities/${communityId}/default-form-template`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formTemplateId }),
    }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  return parseCommunityDetail((await response.json()) as Record<string, unknown>);
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
  return parseClientList(raw);
}

export type { ClientListItem };
