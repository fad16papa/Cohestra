import type { PublicHomepageActivity, PublicSitePayload, SiteSectionsDocument } from "@/lib/public-site-api";
import { fetchServerApi } from "@/lib/server-api-fetch";

export type PublicDoorKind =
  | "marketing"
  | "unknown"
  | "suspended"
  | "archived"
  | "active";

export type PublicDoorPayload = {
  kind: PublicDoorKind;
  plan: string | null;
  tenantName: string | null;
  tenantSlug: string | null;
  site: PublicSitePayload | null;
  stubActivities: PublicHomepageActivity[];
  builderLocked: boolean;
};

function parseActivity(raw: Record<string, unknown>): PublicHomepageActivity | null {
  const slug = raw.slug ?? raw.Slug;
  const name = raw.name ?? raw.Name;
  if (typeof slug !== "string" || typeof name !== "string") {
    return null;
  }

  return {
    slug,
    name,
    schedule: String(raw.schedule ?? raw.Schedule ?? ""),
    location: String(raw.location ?? raw.Location ?? ""),
    communityLabel: String(raw.communityLabel ?? raw.CommunityLabel ?? ""),
    heroImageUrl:
      typeof (raw.heroImageUrl ?? raw.HeroImageUrl) === "string"
        ? String(raw.heroImageUrl ?? raw.HeroImageUrl)
        : null,
    accentColor:
      typeof (raw.accentColor ?? raw.AccentColor) === "string"
        ? String(raw.accentColor ?? raw.AccentColor)
        : null,
  };
}

function parseSiteDocument(raw: Record<string, unknown>): SiteSectionsDocument | null {
  const schemaVersion = raw.schemaVersion ?? raw.SchemaVersion;
  const siteName = raw.siteName ?? raw.SiteName;
  const sectionsRaw = raw.sections ?? raw.Sections;
  if (typeof schemaVersion !== "number" || typeof siteName !== "string" || !Array.isArray(sectionsRaw)) {
    return null;
  }

  const sections = sectionsRaw
    .map((section) => {
      if (typeof section !== "object" || section === null) {
        return null;
      }

      const item = section as Record<string, unknown>;
      const id = item.id ?? item.Id;
      const type = item.type ?? item.Type;
      const enabled = item.enabled ?? item.Enabled;
      const order = item.order ?? item.Order;
      const props = item.props ?? item.Props;
      if (
        typeof id !== "string" ||
        typeof type !== "string" ||
        typeof enabled !== "boolean" ||
        typeof order !== "number"
      ) {
        return null;
      }

      return {
        id,
        type,
        enabled,
        order,
        props: typeof props === "object" && props !== null ? (props as Record<string, unknown>) : {},
      };
    })
    .filter((section): section is NonNullable<typeof section> => section !== null);

  return {
    schemaVersion,
    siteName,
    accentColor:
      typeof (raw.accentColor ?? raw.AccentColor) === "string"
        ? String(raw.accentColor ?? raw.AccentColor)
        : null,
    logoAssetId:
      typeof (raw.logoAssetId ?? raw.LogoAssetId) === "string"
        ? String(raw.logoAssetId ?? raw.LogoAssetId)
        : null,
    presetId:
      typeof (raw.presetId ?? raw.PresetId) === "string"
        ? String(raw.presetId ?? raw.PresetId)
        : null,
    sections,
  };
}

function parseDoorPayload(raw: Record<string, unknown>): PublicDoorPayload {
  const kindRaw = String(raw.kind ?? raw.Kind ?? "unknown").toLowerCase();
  const kind: PublicDoorKind =
    kindRaw === "marketing" ||
    kindRaw === "unknown" ||
    kindRaw === "suspended" ||
    kindRaw === "archived" ||
    kindRaw === "active"
      ? kindRaw
      : "unknown";

  const siteRaw = raw.site ?? raw.Site;
  let site: PublicSitePayload | null = null;
  if (siteRaw && typeof siteRaw === "object") {
    const siteObj = siteRaw as Record<string, unknown>;
    const publishedRaw = siteObj.published ?? siteObj.Published;
    const published =
      publishedRaw && typeof publishedRaw === "object"
        ? parseSiteDocument(publishedRaw as Record<string, unknown>)
        : null;
    const upcomingRaw = siteObj.upcomingActivities ?? siteObj.UpcomingActivities;
    const upcomingActivities = Array.isArray(upcomingRaw)
      ? upcomingRaw
          .map((item) =>
            typeof item === "object" && item !== null
              ? parseActivity(item as Record<string, unknown>)
              : null
          )
          .filter((item): item is PublicHomepageActivity => item !== null)
      : [];

    if (published) {
      site = {
        published,
        publishedAt:
          typeof (siteObj.publishedAt ?? siteObj.PublishedAt) === "string"
            ? String(siteObj.publishedAt ?? siteObj.PublishedAt)
            : null,
        upcomingActivities,
      };
    }
  }

  const stubRaw = raw.stubActivities ?? raw.StubActivities;
  const stubActivities = Array.isArray(stubRaw)
    ? stubRaw
        .map((item) =>
          typeof item === "object" && item !== null
            ? parseActivity(item as Record<string, unknown>)
            : null
        )
        .filter((item): item is PublicHomepageActivity => item !== null)
    : [];

  return {
    kind,
    plan: typeof (raw.plan ?? raw.Plan) === "string" ? String(raw.plan ?? raw.Plan) : null,
    tenantName:
      typeof (raw.tenantName ?? raw.TenantName) === "string"
        ? String(raw.tenantName ?? raw.TenantName)
        : null,
    tenantSlug:
      typeof (raw.tenantSlug ?? raw.TenantSlug) === "string"
        ? String(raw.tenantSlug ?? raw.TenantSlug)
        : null,
    site,
    stubActivities,
    builderLocked: Boolean(raw.builderLocked ?? raw.BuilderLocked),
  };
}

export async function fetchPublicDoorServer(): Promise<PublicDoorPayload> {
  try {
    const response = await fetchServerApi("/api/v1/public/door", { cache: "no-store" });
    if (!response.ok) {
      return {
        kind: "unknown",
        plan: null,
        tenantName: null,
        tenantSlug: null,
        site: null,
        stubActivities: [],
        builderLocked: false,
      };
    }

    const raw = (await response.json()) as Record<string, unknown>;
    return parseDoorPayload(raw);
  } catch {
    return {
      kind: "unknown",
      plan: null,
      tenantName: null,
      tenantSlug: null,
      site: null,
      stubActivities: [],
      builderLocked: false,
    };
  }
}
