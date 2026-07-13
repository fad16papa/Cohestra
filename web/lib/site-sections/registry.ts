import type { SiteSection } from "@/lib/public-site-api";

import { MAX_LIST_ITEMS } from "./limits";

export const SECTION_TYPE_LABELS: Record<string, string> = {
  hero: "Hero",
  highlights: "Feature cards",
  upcomingActivities: "Upcoming activities",
  howItWorks: "How it works",
  footer: "Footer",
  carousel: "Carousel",
  testimonials: "Testimonials",
  faq: "FAQ",
  stats: "Stats",
  ctaBand: "CTA band",
};

/** Section types operators can add from the builder palette. */
export const ADDABLE_SECTION_TYPES = [
  "carousel",
  "testimonials",
  "faq",
  "stats",
  "ctaBand",
  "highlights",
  "howItWorks",
  "upcomingActivities",
  "footer",
] as const;

export type AddableSectionType = (typeof ADDABLE_SECTION_TYPES)[number];

function newId(type: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${type}-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `${type}-${Date.now().toString(36)}`;
}

function newListItemKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `item-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `item-${Date.now().toString(36)}`;
}

function defaultSlide() {
  return {
    _key: newListItemKey(),
    imageAssetId: "",
    headline: "",
    description: "",
    cta: { label: "", target: "scroll-upcoming" },
  };
}

function defaultTestimonial() {
  return { _key: newListItemKey(), quote: "", name: "", role: "", avatarAssetId: "" };
}

function defaultFaqItem() {
  return { _key: newListItemKey(), question: "", answer: "" };
}

function defaultStatItem() {
  return { _key: newListItemKey(), value: "", label: "" };
}

export function getDefaultSectionProps(type: string): Record<string, unknown> {
  switch (type.toLowerCase()) {
    case "carousel":
      return {
        title: "Featured",
        autoplay: false,
        variant: "default",
        slides: [defaultSlide()],
      };
    case "testimonials":
      return {
        title: "What members say",
        variant: "default",
        items: [defaultTestimonial()],
      };
    case "faq":
      return {
        title: "Common questions",
        variant: "default",
        items: [defaultFaqItem()],
      };
    case "stats":
      return {
        variant: "accent",
        items: [
          { value: "12+", label: "Events" },
          { value: "400+", label: "Registrations" },
        ],
      };
    case "ctaband":
      return {
        headline: "Ready to join?",
        description: "Browse upcoming activities and register in seconds.",
        variant: "accent",
        primaryCta: { label: "See events", target: "scroll-upcoming" },
      };
    case "highlights":
      return {
        variant: "default",
        items: [
          {
            title: "Discover activities",
            description: "Workshops, game nights, and social gatherings in one place.",
            icon: "calendar",
          },
        ],
      };
    case "howitworks":
      return {
        title: "How it works",
        description: "",
        variant: "default",
        steps: [{ title: "Browse events", description: "Find activities that fit your interests." }],
      };
    case "upcomingactivities":
      return {
        title: "Upcoming activities",
        limit: 6,
        emptyMessage: "New events coming soon.",
        variant: "default",
      };
    case "footer":
      return {
        poweredByLabel: "Powered by CreativoRare",
        variant: "default",
      };
    default:
      return { variant: "default" };
  }
}

export function createSection(type: string, order: number): SiteSection {
  return {
    id: newId(type.toLowerCase()),
    type,
    enabled: true,
    order,
    props: getDefaultSectionProps(type),
  };
}

export function normalizeSectionType(type: string): string {
  return type.toLowerCase();
}

export function isProtectedFromRemoval(
  document: { sections: SiteSection[] },
  section: SiteSection
): boolean {
  if (normalizeSectionType(section.type) !== "hero") {
    return false;
  }

  const enabledHeroCount = document.sections.filter(
    (entry) => normalizeSectionType(entry.type) === "hero" && entry.enabled
  ).length;

  if (!section.enabled) {
    return enabledHeroCount === 0;
  }

  return enabledHeroCount <= 1;
}

export function clampListItems<T>(items: T[]): T[] {
  return items.slice(0, MAX_LIST_ITEMS);
}
