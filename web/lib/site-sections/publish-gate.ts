import type { Activity } from "@/lib/activities-api";
import type { SiteSection, SiteSectionsDocument } from "@/lib/public-site-api";

function readCtaTarget(props: Record<string, unknown>, key: string): string | null {
  const cta = props[key];
  if (typeof cta !== "object" || cta === null) {
    return null;
  }

  const target = (cta as Record<string, unknown>).target;
  return typeof target === "string" ? target : null;
}

function readNestedCtaTarget(item: Record<string, unknown>): string | null {
  const cta = item.cta;
  if (typeof cta !== "object" || cta === null) {
    return null;
  }

  const target = (cta as Record<string, unknown>).target;
  return typeof target === "string" ? target : null;
}

function validateActivityTarget(
  target: string,
  publishedSlugs: Set<string>,
  blockers: string[],
  context: string
): void {
  if (!target.startsWith("activity:")) {
    return;
  }

  const slug = target.slice("activity:".length).trim().toLowerCase();
  if (!slug) {
    blockers.push(`${context}: activity slug is required.`);
    return;
  }

  if (!publishedSlugs.has(slug)) {
    blockers.push(
      `${context}: references unpublished or missing activity "${slug}".`
    );
  }
}

function slideHasContent(item: unknown): boolean {
  if (typeof item !== "object" || item === null) {
    return false;
  }

  const record = item as Record<string, unknown>;
  const imageAssetId =
    typeof record.imageAssetId === "string" ? record.imageAssetId.trim() : "";
  const headline = typeof record.headline === "string" ? record.headline.trim() : "";

  return Boolean(imageAssetId || headline);
}

function testimonialHasContent(item: unknown): boolean {
  if (typeof item !== "object" || item === null) {
    return false;
  }

  const record = item as Record<string, unknown>;
  const quote = typeof record.quote === "string" ? record.quote.trim() : "";
  return Boolean(quote);
}

function faqHasContent(item: unknown): boolean {
  if (typeof item !== "object" || item === null) {
    return false;
  }

  const record = item as Record<string, unknown>;
  const question = typeof record.question === "string" ? record.question.trim() : "";
  return Boolean(question);
}

export function collectSectionPublishIssues(
  section: SiteSection,
  publishedSlugs: Set<string>,
  blockers: string[],
  warnings: string[]
): void {
  const type = section.type.toLowerCase();
  const props = section.props;
  const label = section.type;

  if (type === "carousel") {
    const slides = Array.isArray(props.slides) ? props.slides : [];
    const validSlides = slides.filter(slideHasContent);
    if (validSlides.length === 0) {
      blockers.push(`${label}: add at least one slide with an image or headline.`);
    }

    slides.forEach((slide, index) => {
      if (typeof slide !== "object" || slide === null) {
        return;
      }

      const target = readNestedCtaTarget(slide as Record<string, unknown>);
      if (target) {
        validateActivityTarget(target, publishedSlugs, blockers, `${label} slide ${index + 1}`);
      }
    });
  }

  if (type === "testimonials") {
    const items = Array.isArray(props.items) ? props.items : [];
    if (!items.some(testimonialHasContent)) {
      blockers.push(`${label}: add at least one testimonial quote.`);
    }
  }

  if (type === "faq") {
    const items = Array.isArray(props.items) ? props.items : [];
    if (!items.some(faqHasContent)) {
      blockers.push(`${label}: add at least one FAQ question.`);
    }
  }

  if (type === "stats") {
    const items = Array.isArray(props.items) ? props.items : [];
    const valid = items.filter((item) => {
      if (typeof item !== "object" || item === null) {
        return false;
      }

      const record = item as Record<string, unknown>;
      const value = typeof record.value === "string" ? record.value.trim() : "";
      return Boolean(value);
    });

    if (valid.length === 0) {
      blockers.push(`${label}: add at least one stat value.`);
    }
  }

  if (type === "ctaband") {
    const headline =
      typeof props.headline === "string" ? props.headline.trim() : "";
    if (!headline) {
      blockers.push(`${label}: headline is required.`);
    }

    const target = readCtaTarget(props, "primaryCta");
    if (target) {
      validateActivityTarget(target, publishedSlugs, blockers, label);
    }
  }

  if (type === "hero") {
    const heroImageAssetId = props.heroImageAssetId;
    if (typeof heroImageAssetId !== "string" || !heroImageAssetId.trim()) {
      warnings.push("Hero image is not set. Social link previews may look plain.");
    }

    for (const key of ["primaryCta", "secondaryCta"] as const) {
      const target = readCtaTarget(props, key);
      if (target) {
        validateActivityTarget(target, publishedSlugs, blockers, "Hero CTA");
      }
    }
  }
}

export function collectDocumentPublishIssues(
  draft: SiteSectionsDocument,
  publishedActivities: Activity[]
): { blockers: string[]; warnings: string[] } {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const publishedSlugs = new Set(
    publishedActivities
      .filter((activity) => activity.status === "published")
      .map((activity) => activity.slug.trim().toLowerCase())
  );

  const enabledSections = draft.sections.filter((section) => section.enabled);
  if (enabledSections.length === 0) {
    blockers.push("At least one section must be enabled to publish.");
  }

  const hero = enabledSections.find((section) => section.type.toLowerCase() === "hero");
  const headline =
    typeof hero?.props.headline === "string" ? hero.props.headline.trim() : "";

  if (!hero || !headline) {
    blockers.push("Hero headline is required to publish.");
  }

  for (const section of enabledSections) {
    collectSectionPublishIssues(section, publishedSlugs, blockers, warnings);
  }

  return { blockers, warnings };
}
