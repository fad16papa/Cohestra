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

export function ownedActivityName(ownerKey: string, workerIndex = 0): string {
  const safe = ownerKey
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  return `e2e-${safe}-w${workerIndex}`;
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
