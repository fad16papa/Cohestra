import type { PublicSitePayload, SiteSection } from "@/lib/public-site-api";
import { SECTION_TYPE_LABELS } from "@/lib/site-sections/registry";

export const WEBSITE_CINEMA_STUDIO_DEFAULT_SECTION_ID = "demo-upcoming";

/** Normalize demo JSON section types to registry keys. */
export function normalizeWebsiteSectionType(type: string): string {
  if (type === "upcomingactivities") {
    return "upcomingActivities";
  }
  return type;
}

export function getWebsiteSectionLabel(type: string): string {
  const normalized = normalizeWebsiteSectionType(type);
  return SECTION_TYPE_LABELS[normalized] ?? normalized;
}

export function listWebsiteCinemaSections(site: PublicSitePayload): SiteSection[] {
  return [...site.published.sections]
    .filter((section) => section.enabled)
    .sort((a, b) => a.order - b.order);
}

export function getWebsiteCinemaDefaultSectionId(site: PublicSitePayload): string {
  const sections = listWebsiteCinemaSections(site);
  const upcoming = sections.find(
    (section) => normalizeWebsiteSectionType(section.type) === "upcomingActivities"
  );
  return upcoming?.id ?? sections[0]?.id ?? WEBSITE_CINEMA_STUDIO_DEFAULT_SECTION_ID;
}

export type WebsiteCinemaInspectorField = {
  label: string;
  value: string;
};

export function getWebsiteCinemaInspectorFields(
  section: SiteSection | undefined,
  activityCount: number
): WebsiteCinemaInspectorField[] {
  if (!section) {
    return [];
  }

  const props = section.props ?? {};
  const normalized = normalizeWebsiteSectionType(section.type);

  if (normalized === "upcomingActivities") {
    return [
      { label: "Section title", value: String(props.title ?? "This week") },
      { label: "Activity limit", value: String(props.limit ?? 6) },
      {
        label: "Data source",
        value: `${activityCount} published activities from Cohestra`,
      },
    ];
  }

  if (normalized === "hero") {
    return [
      { label: "Headline", value: String(props.headline ?? "") },
      { label: "Description", value: String(props.description ?? "") },
    ];
  }

  if (normalized === "highlights") {
    const items = Array.isArray(props.items) ? props.items : [];
    return [
      { label: "Cards", value: `${items.length} feature cards` },
      {
        label: "First card",
        value: String((items[0] as { title?: string } | undefined)?.title ?? ""),
      },
    ];
  }

  if (normalized === "footer") {
    return [{ label: "Footer", value: "Club identity and hostname" }];
  }

  return [{ label: "Section", value: getWebsiteSectionLabel(section.type) }];
}
