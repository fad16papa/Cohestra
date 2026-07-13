import type { SiteSection, SiteSectionsDocument } from "@/lib/public-site-api";
import { getSortedSections } from "@/lib/site-draft-utils";

import {
  ADDABLE_SECTION_TYPES,
  createSection,
  isProtectedFromRemoval,
  type AddableSectionType,
} from "./registry";
import { MAX_SECTIONS } from "./limits";

export function canAddSection(document: SiteSectionsDocument): boolean {
  return document.sections.length < MAX_SECTIONS;
}

export function addSectionToDocument(
  document: SiteSectionsDocument,
  type: AddableSectionType
): { document: SiteSectionsDocument; error?: string } {
  if (!ADDABLE_SECTION_TYPES.includes(type)) {
    return { document, error: "Unsupported section type." };
  }

  if (!canAddSection(document)) {
    return {
      document,
      error: `Homepage supports up to ${MAX_SECTIONS} sections.`,
    };
  }

  const maxOrder = document.sections.reduce(
    (max, section) => Math.max(max, section.order),
    -1
  );
  const section = createSection(type, maxOrder + 1);

  return {
    document: {
      ...document,
      sections: [...document.sections, section],
    },
  };
}

export function removeSectionFromDocument(
  document: SiteSectionsDocument,
  sectionId: string
): { document: SiteSectionsDocument; error?: string } {
  const section = document.sections.find((entry) => entry.id === sectionId);
  if (!section) {
    return { document };
  }

  if (isProtectedFromRemoval(document, section)) {
    return {
      document,
      error: "Homepage must keep at least one enabled hero section.",
    };
  }

  const remaining = document.sections.filter((entry) => entry.id !== sectionId);
  const normalized = getSortedSections({ ...document, sections: remaining }).map(
    (entry, order) => ({ ...entry, order })
  );

  return {
    document: {
      ...document,
      sections: normalized,
    },
  };
}

export function findSection(
  document: SiteSectionsDocument,
  sectionId: string
): SiteSection | undefined {
  return document.sections.find((entry) => entry.id === sectionId);
}
