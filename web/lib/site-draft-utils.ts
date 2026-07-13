import type { Activity } from "@/lib/activities-api";
import type { SiteSection, SiteSectionsDocument } from "@/lib/public-site-api";
import { SECTION_TYPE_LABELS } from "@/lib/site-sections/registry";
import { collectDocumentPublishIssues } from "@/lib/site-sections/publish-gate";

export { SECTION_TYPE_LABELS };

export function cloneSiteDocument(document: SiteSectionsDocument): SiteSectionsDocument {
  return JSON.parse(JSON.stringify(document)) as SiteSectionsDocument;
}

export function serializeSiteDocument(document: SiteSectionsDocument): string {
  return JSON.stringify({
    schemaVersion: document.schemaVersion,
    siteName: document.siteName,
    accentColor: document.accentColor,
    logoAssetId: document.logoAssetId,
    presetId: document.presetId,
    sections: [...document.sections]
      .sort((left, right) => left.order - right.order)
      .map((section) => ({
        id: section.id,
        type: section.type,
        enabled: section.enabled,
        order: section.order,
        props: section.props,
      })),
  });
}

export function siteDocumentsEqual(
  left: SiteSectionsDocument,
  right: SiteSectionsDocument
): boolean {
  return serializeSiteDocument(left) === serializeSiteDocument(right);
}

export function getSortedSections(document: SiteSectionsDocument): SiteSection[] {
  return [...document.sections].sort((left, right) => left.order - right.order);
}

export function updateSiteDocument(
  document: SiteSectionsDocument,
  patch: Partial<Omit<SiteSectionsDocument, "sections">>
): SiteSectionsDocument {
  return { ...document, ...patch };
}

export function updateSection(
  document: SiteSectionsDocument,
  sectionId: string,
  updater: (section: SiteSection) => SiteSection
): SiteSectionsDocument {
  return {
    ...document,
    sections: document.sections.map((section) =>
      section.id === sectionId ? updater(section) : section
    ),
  };
}

export function updateSectionProps(
  document: SiteSectionsDocument,
  sectionId: string,
  propsPatch: Record<string, unknown>
): SiteSectionsDocument {
  return updateSection(document, sectionId, (section) => ({
    ...section,
    props: { ...section.props, ...propsPatch },
  }));
}

export function toggleSectionEnabled(
  document: SiteSectionsDocument,
  sectionId: string,
  enabled: boolean
): SiteSectionsDocument {
  return updateSection(document, sectionId, (section) => ({ ...section, enabled }));
}

export function moveSection(
  document: SiteSectionsDocument,
  sectionId: string,
  direction: "up" | "down"
): SiteSectionsDocument {
  const sorted = getSortedSections(document);
  const index = sorted.findIndex((section) => section.id === sectionId);
  if (index < 0) {
    return document;
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= sorted.length) {
    return document;
  }

  const reordered = sorted.map((section, sectionIndex) => {
    if (sectionIndex === index) {
      return { ...sorted[swapIndex], order: section.order };
    }
    if (sectionIndex === swapIndex) {
      return { ...sorted[index], order: section.order };
    }
    return section;
  });

  return {
    ...document,
    sections: reordered
      .sort((left, right) => left.order - right.order)
      .map((section, order) => ({ ...section, order })),
  };
}

export type PublishGateResult = {
  blockers: string[];
  warnings: string[];
};

export function getPublishGateIssues(
  draft: SiteSectionsDocument,
  publishedActivities: Activity[]
): PublishGateResult {
  return collectDocumentPublishIssues(draft, publishedActivities);
}

export function toApiDraftPayload(document: SiteSectionsDocument) {
  return {
    schemaVersion: document.schemaVersion,
    siteName: document.siteName,
    accentColor: document.accentColor,
    logoAssetId: document.logoAssetId,
    presetId: document.presetId,
    sections: getSortedSections(document).map((section) => ({
      id: section.id,
      type: section.type,
      enabled: section.enabled,
      order: section.order,
      props: section.props,
    })),
  };
}
