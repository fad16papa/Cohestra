import type { SiteSection, SiteSectionsDocument } from "@/lib/public-site-api";
import { SECTION_TYPE_LABELS } from "@/lib/site-sections/registry";
import { siteDocumentsEqual } from "@/lib/site-draft-utils";
import { resolveHeroImageUrl } from "@/lib/resolve-hero-image-url";

export type SharePreviewData = {
  url: string;
  title: string;
  description: string;
  imageUrl: string | null;
};

export function getSharePreviewFromDraft(
  draft: SiteSectionsDocument,
  siteUrl: string
): SharePreviewData {
  const hero = draft.sections.find((section) => section.type.toLowerCase() === "hero");
  const heroProps = hero?.props ?? {};
  const headline =
    typeof heroProps.headline === "string" ? heroProps.headline.trim() : "";
  const description =
    typeof heroProps.description === "string" ? heroProps.description.trim() : "";
  const heroImageAssetId =
    typeof heroProps.heroImageAssetId === "string"
      ? heroProps.heroImageAssetId.trim()
      : "";
  const logoAssetId = draft.logoAssetId?.trim() ?? "";
  const siteName = draft.siteName.trim();

  let imageUrl: string | null = null;
  if (heroImageAssetId) {
    imageUrl = resolveHeroImageUrl(
      `/api/v1/public/campaign-assets/${heroImageAssetId}`
    );
  } else if (logoAssetId) {
    imageUrl = resolveHeroImageUrl(`/api/v1/public/campaign-assets/${logoAssetId}`);
  }

  const title = headline || siteName || "Your community homepage";
  const previewDescription =
    description ||
    (siteName
      ? `Discover activities and events from ${siteName}.`
      : "Discover upcoming community activities and events.");

  return {
    url: siteUrl.replace(/\/$/, "") || siteUrl,
    title,
    description: previewDescription.slice(0, 200),
    imageUrl,
  };
}

export type SetupChecklistItem = {
  id: string;
  label: string;
  detail: string;
  done: boolean;
  sectionId?: string;
  action?: "branding" | "site-name";
};

export function getSetupChecklist(
  draft: SiteSectionsDocument,
  options: {
    isDraftSaved: boolean;
    hasPublished: boolean;
    upcomingActivityCount: number;
  }
): SetupChecklistItem[] {
  const hero = draft.sections.find((section) => section.type.toLowerCase() === "hero");
  const heroProps = hero?.props ?? {};
  const headline =
    typeof heroProps.headline === "string" ? heroProps.headline.trim() : "";
  const heroImageAssetId =
    typeof heroProps.heroImageAssetId === "string"
      ? heroProps.heroImageAssetId.trim()
      : "";
  const siteName = draft.siteName.trim();
  const logoAssetId = draft.logoAssetId?.trim() ?? "";

  return [
    {
      id: "site-name",
      label: "Name your site",
      detail: siteName || "Add a name for your homepage header",
      done: siteName.length >= 2,
      action: "site-name",
    },
    {
      id: "logo",
      label: "Upload your logo",
      detail: logoAssetId ? "Logo added" : "Replace the default platform mark",
      done: Boolean(logoAssetId),
      action: "branding",
    },
    {
      id: "hero-headline",
      label: "Write a hero headline",
      detail: headline || "Tell visitors what your community is about",
      done: headline.length >= 3,
      sectionId: hero?.id,
    },
    {
      id: "hero-image",
      label: "Add a hero image",
      detail: heroImageAssetId
        ? "Hero image uploaded"
        : "Recommended — 960×540, 16:9",
      done: Boolean(heroImageAssetId),
      sectionId: hero?.id,
    },
    ...((): SetupChecklistItem[] => {
      const highlightsSection = draft.sections.find(
        (section) =>
          section.type.toLowerCase() === "highlights" && section.enabled
      );
      if (!highlightsSection) {
        return [];
      }

      const items = Array.isArray(highlightsSection.props.items)
        ? highlightsSection.props.items
        : [];
      const filledCards = items.filter((item) => {
        if (typeof item !== "object" || item === null) {
          return false;
        }
        const title = (item as Record<string, unknown>).title;
        return typeof title === "string" && title.trim().length >= 2;
      }).length;

      return [
        {
          id: "feature-cards",
          label: "Edit feature cards",
          detail:
            filledCards > 0
              ? `${filledCards} card${filledCards === 1 ? "" : "s"} below your hero`
              : "The icon cards under your hero image",
          done: filledCards >= 1,
          sectionId: highlightsSection.id,
        },
      ];
    })(),
    {
      id: "events",
      label: "Show upcoming events",
      detail:
        options.upcomingActivityCount > 0
          ? `${options.upcomingActivityCount} published event${options.upcomingActivityCount === 1 ? "" : "s"} featured`
          : "Publish activities and feature them on your homepage",
      done: options.upcomingActivityCount > 0,
    },
    {
      id: "save",
      label: options.hasPublished ? "Save and publish changes" : "Save draft and publish",
      detail: options.isDraftSaved
        ? options.hasPublished
          ? "Draft saved — ready to publish"
          : "Draft saved — publish when ready"
        : "Save your draft before publishing",
      done: options.isDraftSaved,
    },
  ];
}

export function getSectionSummary(section: SiteSection): string {
  const type = section.type.toLowerCase();
  const props = section.props;

  if (!section.enabled) {
    return "Hidden on homepage";
  }

  switch (type) {
    case "hero": {
      const headline = typeof props.headline === "string" ? props.headline.trim() : "";
      return headline || "No headline yet";
    }
    case "carousel": {
      const slides = Array.isArray(props.slides) ? props.slides.length : 0;
      const autoplay = props.autoplay === true;
      return `${slides} slide${slides === 1 ? "" : "s"}${autoplay ? " · autoplay" : ""}`;
    }
    case "testimonials": {
      const items = Array.isArray(props.items) ? props.items.length : 0;
      return `${items} testimonial${items === 1 ? "" : "s"}`;
    }
    case "faq": {
      const items = Array.isArray(props.items) ? props.items.length : 0;
      return `${items} question${items === 1 ? "" : "s"}`;
    }
    case "stats": {
      const items = Array.isArray(props.items) ? props.items.length : 0;
      return `${items} stat${items === 1 ? "" : "s"}`;
    }
    case "highlights": {
      const items = Array.isArray(props.items) ? props.items : [];
      const titles = items
        .map((item) =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as Record<string, unknown>).title === "string"
            ? String((item as Record<string, unknown>).title).trim()
            : ""
        )
        .filter(Boolean);
      if (titles.length === 0) {
        return "No cards yet";
      }
      if (titles.length === 1) {
        return titles[0];
      }
      return `${titles[0]} · ${titles.length} cards`;
    }
    case "howitworks": {
      const steps = Array.isArray(props.steps) ? props.steps.length : 0;
      return `${steps} step${steps === 1 ? "" : "s"}`;
    }
    case "upcomingactivities": {
      const limit =
        typeof props.limit === "number"
          ? props.limit
          : typeof props.limit === "string"
            ? Number.parseInt(props.limit, 10)
            : 6;
      const title = typeof props.title === "string" ? props.title.trim() : "";
      return title
        ? `${title} · up to ${limit} events`
        : `Up to ${limit} events`;
    }
    case "ctaband": {
      const headline = typeof props.headline === "string" ? props.headline.trim() : "";
      return headline || "Call-to-action band";
    }
    case "footer":
      return "Site footer";
    default:
      return SECTION_TYPE_LABELS[type] ?? section.type;
  }
}

function sectionPropsSignature(section: SiteSection): string {
  return JSON.stringify(section.props);
}

export function getPublishChangeSummary(
  draft: SiteSectionsDocument,
  published: SiteSectionsDocument | null
): string[] {
  if (!published) {
    return ["First publish — your homepage will go live for visitors."];
  }

  if (siteDocumentsEqual(draft, published)) {
    return [];
  }

  const changes: string[] = [];

  if (draft.siteName.trim() !== published.siteName.trim()) {
    changes.push(`Site name → "${draft.siteName.trim() || "Untitled"}"`);
  }

  if ((draft.logoAssetId ?? "") !== (published.logoAssetId ?? "")) {
    changes.push("Logo updated");
  }

  if ((draft.accentColor ?? "") !== (published.accentColor ?? "")) {
    changes.push("Accent color updated");
  }

  const publishedById = new Map(
    published.sections.map((section) => [section.id, section])
  );
  const draftById = new Map(draft.sections.map((section) => [section.id, section]));

  for (const section of draft.sections) {
    const label = SECTION_TYPE_LABELS[section.type] ?? section.type;
    const previous = publishedById.get(section.id);

    if (!previous) {
      changes.push(`${label} section added`);
      continue;
    }

    if (section.enabled !== previous.enabled) {
      changes.push(
        `${label} section ${section.enabled ? "enabled" : "hidden"}`
      );
    }

    if (sectionPropsSignature(section) !== sectionPropsSignature(previous)) {
      changes.push(`${label} content updated`);
    }

    if (section.order !== previous.order) {
      changes.push("Section order changed");
    }
  }

  for (const section of published.sections) {
    if (!draftById.has(section.id)) {
      const label = SECTION_TYPE_LABELS[section.type] ?? section.type;
      changes.push(`${label} section removed`);
    }
  }

  return [...new Set(changes)];
}

export function countCompletedChecklistItems(items: SetupChecklistItem[]): {
  completed: number;
  total: number;
} {
  return {
    completed: items.filter((item) => item.done).length,
    total: items.length,
  };
}
