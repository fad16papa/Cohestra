import { getServerApiBaseUrl } from "@/lib/api";

const FETCH_TIMEOUT_MS = 5000;

export type SiteSection = {
  id: string;
  type: string;
  enabled: boolean;
  order: number;
  props: Record<string, unknown>;
};

export type SiteSectionsDocument = {
  schemaVersion: number;
  siteName: string;
  accentColor: string | null;
  logoAssetId: string | null;
  presetId: string | null;
  sections: SiteSection[];
};

export type PublicHomepageActivity = {
  slug: string;
  name: string;
  schedule: string;
  location: string;
  communityLabel: string;
  heroImageUrl: string | null;
  accentColor: string | null;
};

export type PublicSitePayload = {
  published: SiteSectionsDocument;
  publishedAt: string | null;
  upcomingActivities: PublicHomepageActivity[];
};

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseSection(raw: Record<string, unknown>): SiteSection | null {
  const id = readString(raw.id ?? raw.Id);
  const type = readString(raw.type ?? raw.Type);
  const enabled = raw.enabled ?? raw.Enabled;
  const order = raw.order ?? raw.Order;
  const props = raw.props ?? raw.Props;

  if (!id || !type || typeof enabled !== "boolean" || typeof order !== "number") {
    return null;
  }

  return {
    id,
    type,
    enabled,
    order,
    props: typeof props === "object" && props !== null ? (props as Record<string, unknown>) : {},
  };
}

export function parseSiteSectionsDocument(
  raw: Record<string, unknown>
): SiteSectionsDocument | null {
  return parseDocument(raw);
}

function parseDocument(raw: Record<string, unknown>): SiteSectionsDocument | null {
  const schemaVersion = raw.schemaVersion ?? raw.SchemaVersion;
  const siteName = readString(raw.siteName ?? raw.SiteName);
  const sectionsRaw = raw.sections ?? raw.Sections;

  if (typeof schemaVersion !== "number" || !siteName || !Array.isArray(sectionsRaw)) {
    return null;
  }

  const sections = sectionsRaw
    .map((section) =>
      typeof section === "object" && section !== null
        ? parseSection(section as Record<string, unknown>)
        : null
    )
    .filter((section): section is SiteSection => section !== null);

  return {
    schemaVersion,
    siteName,
    accentColor: readString(raw.accentColor ?? raw.AccentColor),
    logoAssetId: readString(raw.logoAssetId ?? raw.LogoAssetId),
    presetId: readString(raw.presetId ?? raw.PresetId),
    sections,
  };
}

function parseActivity(raw: Record<string, unknown>): PublicHomepageActivity | null {
  const slug = readString(raw.slug ?? raw.Slug);
  const name = readString(raw.name ?? raw.Name);

  if (!slug || !name) {
    return null;
  }

  return {
    slug,
    name,
    schedule: readString(raw.schedule ?? raw.Schedule) ?? "",
    location: readString(raw.location ?? raw.Location) ?? "",
    communityLabel: readString(raw.communityLabel ?? raw.CommunityLabel) ?? "",
    heroImageUrl: readString(raw.heroImageUrl ?? raw.HeroImageUrl),
    accentColor: readString(raw.accentColor ?? raw.AccentColor),
  };
}

function parsePublicSitePayload(raw: Record<string, unknown>): PublicSitePayload | null {
  const publishedRaw = raw.published ?? raw.Published;
  if (typeof publishedRaw !== "object" || publishedRaw === null) {
    return null;
  }

  const published = parseDocument(publishedRaw as Record<string, unknown>);
  if (!published) {
    return null;
  }

  const upcomingRaw = raw.upcomingActivities ?? raw.UpcomingActivities;
  const upcomingActivities = Array.isArray(upcomingRaw)
    ? upcomingRaw
        .map((item) =>
          typeof item === "object" && item !== null
            ? parseActivity(item as Record<string, unknown>)
            : null
        )
        .filter((item): item is PublicHomepageActivity => item !== null)
    : [];

  const publishedAt = readString(raw.publishedAt ?? raw.PublishedAt);

  return { published, publishedAt, upcomingActivities };
}

export async function fetchPublicSiteServer(): Promise<PublicSitePayload | null> {
  try {
    const response = await fetch(`${getServerApiBaseUrl()}/api/v1/public/site`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    const raw = (await response.json()) as Record<string, unknown>;
    return parsePublicSitePayload(raw);
  } catch {
    return null;
  }
}

export async function fetchPreviewSiteServer(token: string): Promise<PublicSitePayload | null> {
  if (!token.trim()) {
    return null;
  }

  try {
    const url = new URL(`${getServerApiBaseUrl()}/api/v1/public/site/preview`);
    url.searchParams.set("token", token.trim());

    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      return null;
    }

    const raw = (await response.json()) as Record<string, unknown>;
    return parsePublicSitePayload(raw);
  } catch {
    return null;
  }
}

export function getEnabledSections(document: SiteSectionsDocument): SiteSection[] {
  return [...document.sections]
    .filter((section) => section.enabled)
    .sort((left, right) => left.order - right.order);
}

export function isUpcomingActivitiesSectionEnabled(document: SiteSectionsDocument): boolean {
  return document.sections.some(
    (section) =>
      section.enabled &&
      section.type.toLowerCase() === "upcomingactivities"
  );
}

export function readHeroHeadline(document: SiteSectionsDocument): string | null {
  const hero = document.sections.find(
    (section) => section.enabled && section.type.toLowerCase() === "hero"
  );
  const headline = hero?.props.headline;
  return typeof headline === "string" ? headline : null;
}

export function readHeroDescription(document: SiteSectionsDocument): string | null {
  const hero = document.sections.find(
    (section) => section.enabled && section.type.toLowerCase() === "hero"
  );
  const description = hero?.props.description;
  return typeof description === "string" ? description : null;
}

export function readHeroImageAssetId(document: SiteSectionsDocument): string | null {
  const hero = document.sections.find(
    (section) => section.enabled && section.type.toLowerCase() === "hero"
  );
  const assetId = hero?.props.heroImageAssetId;
  return typeof assetId === "string" && assetId.trim() ? assetId.trim() : null;
}
