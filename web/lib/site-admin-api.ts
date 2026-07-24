import { getPublicApiBaseUrl } from "@/lib/api";
import {
  parseSiteSectionsDocument,
  type PublicHomepageActivity,
  type SiteSectionsDocument,
} from "@/lib/public-site-api";
import { toApiDraftPayload } from "@/lib/site-draft-utils";
import type { SiteBuiltInPresetId } from "@/lib/site-templates";

async function parseProblemDetail(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/problem+json")) {
    try {
      const problem = (await response.json()) as { detail?: string; title?: string };
      return problem.detail ?? problem.title ?? `Request failed (${response.status})`;
    } catch {
      return `Request failed (${response.status})`;
    }
  }

  try {
    const text = await response.text();
    return text.trim() || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export type SavedSiteTemplate = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sectionCount: number;
};

export type SitePageAdmin = {
  draft: SiteSectionsDocument;
  published: SiteSectionsDocument | null;
  draftUpdatedAt: string;
  publishedAt: string | null;
  publishedByUserId: string | null;
  hasUnpublishedChanges: boolean;
  canRevertPublished: boolean;
  previousPublishedAt: string | null;
  savedTemplates: SavedSiteTemplate[];
  builderLocked: boolean;
};

export type SitePreviewToken = {
  token: string;
  expiresAt: string;
};

function parseSavedSiteTemplate(raw: unknown): SavedSiteTemplate | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const id = record.id ?? record.Id;
  const name = record.name ?? record.Name;
  const createdAt = record.createdAt ?? record.CreatedAt;
  const updatedAt = record.updatedAt ?? record.UpdatedAt;
  const sectionCount = record.sectionCount ?? record.SectionCount;

  if (
    typeof id !== "string" ||
    typeof name !== "string" ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string" ||
    typeof sectionCount !== "number"
  ) {
    return null;
  }

  return { id, name, createdAt, updatedAt, sectionCount };
}

function parseSitePageAdmin(raw: Record<string, unknown>): SitePageAdmin | null {
  const draftRaw = raw.draft ?? raw.Draft;
  if (typeof draftRaw !== "object" || draftRaw === null) {
    return null;
  }

  const draft = parseSiteSectionsDocument(draftRaw as Record<string, unknown>);
  if (!draft) {
    return null;
  }

  const publishedRaw = raw.published ?? raw.Published;
  const published =
    typeof publishedRaw === "object" && publishedRaw !== null
      ? parseSiteSectionsDocument(publishedRaw as Record<string, unknown>)
      : null;

  const draftUpdatedAt = raw.draftUpdatedAt ?? raw.DraftUpdatedAt;
  const publishedAt = raw.publishedAt ?? raw.PublishedAt;
  const publishedByUserId = raw.publishedByUserId ?? raw.PublishedByUserId;
  const hasUnpublishedChanges = raw.hasUnpublishedChanges ?? raw.HasUnpublishedChanges;
  const canRevertPublished = raw.canRevertPublished ?? raw.CanRevertPublished;
  const previousPublishedAt = raw.previousPublishedAt ?? raw.PreviousPublishedAt;
  const savedTemplatesRaw = raw.savedTemplates ?? raw.SavedTemplates;
  const builderLocked = raw.builderLocked ?? raw.BuilderLocked;

  if (
    typeof draftUpdatedAt !== "string" ||
    typeof hasUnpublishedChanges !== "boolean" ||
    typeof canRevertPublished !== "boolean"
  ) {
    return null;
  }

  const savedTemplates = Array.isArray(savedTemplatesRaw)
    ? savedTemplatesRaw
        .map(parseSavedSiteTemplate)
        .filter((item): item is SavedSiteTemplate => item !== null)
    : [];

  return {
    draft,
    published,
    draftUpdatedAt,
    publishedAt: typeof publishedAt === "string" ? publishedAt : null,
    publishedByUserId:
      typeof publishedByUserId === "string" ? publishedByUserId : null,
    hasUnpublishedChanges,
    canRevertPublished,
    previousPublishedAt:
      typeof previousPublishedAt === "string" ? previousPublishedAt : null,
    savedTemplates,
    builderLocked: Boolean(builderLocked),
  };
}

export async function fetchSiteAdmin(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<SitePageAdmin> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/site`);

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const parsed = parseSitePageAdmin((await response.json()) as Record<string, unknown>);
  if (!parsed) {
    throw new Error("Could not read site configuration.");
  }

  return parsed;
}

export async function saveSiteDraft(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  draft: SiteSectionsDocument
): Promise<SitePageAdmin> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/site`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draft: toApiDraftPayload(draft) }),
  });

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const parsed = parseSitePageAdmin((await response.json()) as Record<string, unknown>);
  if (!parsed) {
    throw new Error("Could not read saved site configuration.");
  }

  return parsed;
}

export async function publishSite(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<SitePageAdmin> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/site/publish`,
    { method: "POST" }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const parsed = parseSitePageAdmin((await response.json()) as Record<string, unknown>);
  if (!parsed) {
    throw new Error("Could not read published site configuration.");
  }

  return parsed;
}

export async function createSitePreviewToken(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<SitePreviewToken> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/site/preview-token`,
    { method: "POST" }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const token = raw.token ?? raw.Token;
  const expiresAt = raw.expiresAt ?? raw.ExpiresAt;

  if (typeof token !== "string" || typeof expiresAt !== "string") {
    throw new Error("Could not create preview link.");
  }

  return { token, expiresAt };
}

export async function applySitePreset(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  presetId: SiteBuiltInPresetId
): Promise<SitePageAdmin> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/site/apply-preset`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ presetId }),
    }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const parsed = parseSitePageAdmin((await response.json()) as Record<string, unknown>);
  if (!parsed) {
    throw new Error("Could not apply homepage preset.");
  }

  return parsed;
}

export async function createSavedSiteTemplate(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  name: string
): Promise<SavedSiteTemplate> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/site/templates`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const parsed = parseSavedSiteTemplate(await response.json());
  if (!parsed) {
    throw new Error("Could not save homepage template.");
  }

  return parsed;
}

export async function applySavedSiteTemplate(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  templateId: string
): Promise<SitePageAdmin> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/site/templates/${templateId}/apply`,
    { method: "POST" }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const parsed = parseSitePageAdmin((await response.json()) as Record<string, unknown>);
  if (!parsed) {
    throw new Error("Could not apply saved homepage template.");
  }

  return parsed;
}

export async function deleteSavedSiteTemplate(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  templateId: string
): Promise<SitePageAdmin> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/site/templates/${templateId}`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const parsed = parseSitePageAdmin((await response.json()) as Record<string, unknown>);
  if (!parsed) {
    throw new Error("Could not delete homepage template.");
  }

  return parsed;
}

export async function revertPublishedSite(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<SitePageAdmin> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/site/revert-published`,
    { method: "POST" }
  );

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const parsed = parseSitePageAdmin((await response.json()) as Record<string, unknown>);
  if (!parsed) {
    throw new Error("Could not revert published homepage.");
  }

  return parsed;
}

export async function fetchPublicUpcomingActivities(): Promise<PublicHomepageActivity[]> {
  try {
    const response = await fetch(`${getPublicApiBaseUrl()}/api/v1/public/site`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const raw = (await response.json()) as Record<string, unknown>;
    const upcomingRaw = raw.upcomingActivities ?? raw.UpcomingActivities;
    if (!Array.isArray(upcomingRaw)) {
      return [];
    }

    return upcomingRaw
      .map((item) => {
        if (typeof item !== "object" || item === null) {
          return null;
        }

        const record = item as Record<string, unknown>;
        const slug = record.slug ?? record.Slug;
        const name = record.name ?? record.Name;
        if (typeof slug !== "string" || typeof name !== "string") {
          return null;
        }

        return {
          slug,
          name,
          schedule:
            typeof (record.schedule ?? record.Schedule) === "string"
              ? String(record.schedule ?? record.Schedule)
              : "",
          location:
            typeof (record.location ?? record.Location) === "string"
              ? String(record.location ?? record.Location)
              : "",
          communityLabel:
            typeof (record.communityLabel ?? record.CommunityLabel) === "string"
              ? String(record.communityLabel ?? record.CommunityLabel)
              : "",
          heroImageUrl:
            typeof (record.heroImageUrl ?? record.HeroImageUrl) === "string"
              ? String(record.heroImageUrl ?? record.HeroImageUrl)
              : null,
          accentColor:
            typeof (record.accentColor ?? record.AccentColor) === "string"
              ? String(record.accentColor ?? record.AccentColor)
              : null,
        } satisfies PublicHomepageActivity;
      })
      .filter((item): item is PublicHomepageActivity => item !== null);
  } catch {
    return [];
  }
}
