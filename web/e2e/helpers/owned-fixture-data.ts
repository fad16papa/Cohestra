export const CANONICAL_DEMO_SLUGS = [
  "demo-marina-social-meetup",
  "demo-runners-draft-clinic",
  "demo-wellness-morning-yoga",
] as const;

export const DEFAULT_TENANT_SLUG = "default";
export const BASIC_TENANT_SLUG = process.env.E2E_BASIC_SLUG ?? "px2-basic";

export const SINGLE_PAGE_CENTERED_THEME = {
  preset: "classic",
  inheritCommunityBrand: true,
  accentColor: null,
  heroImageUrl: null,
  experience: {
    layout: "centered",
    style: "modern",
    flow: "single-page",
    heroDisplay: "cover",
  },
} as const;

export const CONVERSATIONAL_THEME = {
  preset: "classic",
  inheritCommunityBrand: true,
  accentColor: null,
  heroImageUrl: null,
  experience: {
    layout: "centered",
    style: "modern",
    flow: "conversational",
    heroDisplay: "cover",
  },
} as const;

export const MARINA_LIKE_FORM_SCHEMA = {
  version: 1,
  fields: [
    {
      id: "full_name",
      type: "text",
      label: "Full name",
      required: true,
      placeholder: null,
      options: null,
      consentText: null,
    },
    {
      id: "phone",
      type: "phone",
      label: "Phone",
      required: true,
      placeholder: null,
      options: null,
      consentText: null,
      phoneCountry: "SG",
    },
    {
      id: "email",
      type: "email",
      label: "Email",
      required: false,
      placeholder: null,
      options: null,
      consentText: null,
    },
    {
      id: "consent",
      type: "consent",
      label: "Consent",
      required: true,
      placeholder: null,
      options: null,
      consentText: "I agree to be contacted about community activities.",
    },
  ],
};

export const LIVE_OWNER_KEYS = [
  "38-3-366",
  "38-3-367",
  "38-3-epic35",
  "38-3-epic35-conv",
  "38-3-epic35-fs",
  "38-3-cols-cp",
  "38-3-cols-pub",
  "38-3-cols-basic",
  "38-3-cols-mx",
  "38-3-cols-exp",
  "38-3-365-cp",
  "38-3-365",
  "38-3-success",
  "38-3-responsive",
] as const;

export function ownedActivityName(ownerKey: string, workerIndex = 0): string {
  if (!Number.isInteger(workerIndex) || workerIndex < 0 || workerIndex > 99) {
    throw new Error("workerIndex must be an integer from 0 to 99.");
  }
  const safe = ownerKey
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  if (!safe) {
    throw new Error("ownerKey must contain at least one alphanumeric character.");
  }
  return `e2e-${safe}-w${workerIndex}`;
}

/** ASCII-equivalent of ActivitySlugGenerator.Slugify for owned fixture names. */
export function slugifyOwnedName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 220)
    .replace(/-+$/g, "");
  return slug || "activity";
}

export function preferOwnedActivityMatch<T extends { slug: string }>(
  matches: T[],
  expectedSlug: string
): T | undefined {
  return matches.find((item) => item.slug === expectedSlug) ?? matches[0];
}

export type CanonicalThemeFields = {
  preset: unknown;
  inheritCommunityBrand: unknown;
  accentColor: unknown;
  heroImageUrl: unknown;
  layout: unknown;
  style: unknown;
  flow: unknown;
  heroDisplay: unknown;
  designTokens: unknown;
};

export type CanonicalSnapshot = {
  slug: string;
  name: string;
  status: string;
  category: string;
  communityLabel: string;
  maxRegistrants: unknown;
  showOnHomepage: unknown;
  theme: CanonicalThemeFields;
  formSchema: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function extractCanonicalTheme(record: Record<string, unknown>): CanonicalThemeFields {
  const theme = asRecord(record.registrationTheme ?? record.RegistrationTheme);
  const experience = asRecord(theme?.experience ?? theme?.Experience);
  return {
    preset: theme?.preset ?? theme?.Preset ?? null,
    inheritCommunityBrand: theme?.inheritCommunityBrand ?? theme?.InheritCommunityBrand ?? null,
    accentColor: theme?.accentColor ?? theme?.AccentColor ?? null,
    heroImageUrl: theme?.heroImageUrl ?? theme?.HeroImageUrl ?? null,
    layout: experience?.layout ?? experience?.Layout ?? null,
    style: experience?.style ?? experience?.Style ?? null,
    flow: experience?.flow ?? experience?.Flow ?? null,
    heroDisplay: experience?.heroDisplay ?? experience?.HeroDisplay ?? null,
    designTokens: theme?.designTokens ?? theme?.DesignTokens ?? null,
  };
}

export function isOwnedFixtureName(name: string): boolean {
  return /^e2e-[a-z0-9-]+-w\d+$/.test(name);
}

export function isCanonicalDemoSlug(slug: string): boolean {
  return (CANONICAL_DEMO_SLUGS as readonly string[]).includes(slug);
}

export function resolveE2eApiBase(): string {
  if (process.env.E2E_API_BASE_URL) {
    return process.env.E2E_API_BASE_URL;
  }
  const pub = process.env.PUBLIC_BASE_URL;
  if (pub && !/:3000\b/.test(pub)) {
    return pub;
  }
  return "http://localhost:8080";
}

export function tenantApiHost(slug: string, apiBase = resolveE2eApiBase()): string {
  try {
    const url = new URL(apiBase);
    return `${slug}.localhost${url.port ? `:${url.port}` : ""}`;
  } catch {
    return `${slug}.localhost`;
  }
}

export function tenantWebOrigin(slug: string): string {
  const configured = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
  const url = new URL(configured);
  url.hostname = `${slug}.localhost`;
  return url.origin;
}
