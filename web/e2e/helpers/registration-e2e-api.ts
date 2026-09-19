import type { APIRequestContext } from "@playwright/test";

const API_BASE =
  process.env.E2E_API_BASE_URL ??
  process.env.PUBLIC_BASE_URL ??
  "http://localhost:8088";
const OPERATOR_EMAIL = process.env.E2E_OPERATOR_EMAIL ?? "operator@cohestra.local";
const OPERATOR_PASSWORD = process.env.E2E_OPERATOR_PASSWORD ?? "ChangeMe123!";

export type ExperienceFixture = {
  label: string;
  theme: {
    preset: string;
    inheritCommunityBrand: boolean;
    accentColor: string | null;
    heroImageUrl: string | null;
    experience?: {
      layout?: string | null;
      style?: string | null;
      flow?: string | null;
      heroDisplay?: string | null;
    } | null;
  };
  expect: {
    splitPanel?: boolean;
    posterPanel?: boolean;
    conversational?: boolean;
    centered?: boolean;
  };
};

export const EPIC_35_EXPERIENCES: ExperienceFixture[] = [
  {
    label: "modern-centered",
    theme: {
      preset: "classic",
      inheritCommunityBrand: true,
      accentColor: null,
      heroImageUrl: null,
      experience: { layout: "centered", style: "modern", flow: "single-page", heroDisplay: "cover" },
    },
    expect: { centered: true },
  },
  {
    label: "split-event",
    theme: {
      preset: "classic",
      inheritCommunityBrand: true,
      accentColor: null,
      heroImageUrl: null,
      experience: { layout: "split", style: "modern", flow: "single-page", heroDisplay: "split" },
    },
    expect: { splitPanel: true },
  },
  {
    label: "event-poster",
    theme: {
      preset: "classic",
      inheritCommunityBrand: true,
      accentColor: null,
      heroImageUrl: null,
      experience: { layout: "poster", style: "modern", flow: "single-page", heroDisplay: "cover" },
    },
    expect: { posterPanel: true },
  },
  {
    label: "conversational",
    theme: {
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
    },
    expect: { conversational: true, centered: true },
  },
];

export const EPIC_35_VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 430, height: 932 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
] as const;

export function tenantWebBase(): string {
  const configured = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
  if (configured.includes("localhost") && !configured.includes(".localhost")) {
    return configured.replace("://localhost", "://default.localhost");
  }
  return configured;
}

function tenantHostHeader(): string {
  try {
    const url = new URL(API_BASE);
    if (url.hostname === "localhost") {
      return `default.localhost${url.port ? `:${url.port}` : ""}`;
    }
    return url.host;
  } catch {
    return "default.localhost";
  }
}

export type OperatorSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export async function loginOperatorSession(
  request: APIRequestContext
): Promise<OperatorSession> {
  const response = await request.post(`${API_BASE}/api/v1/auth/login`, {
    data: { email: OPERATOR_EMAIL, password: OPERATOR_PASSWORD },
    headers: { Host: tenantHostHeader() },
  });
  if (!response.ok()) {
    throw new Error(`Operator login failed: ${response.status()} ${await response.text()}`);
  }
  const body = (await response.json()) as {
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
  };
  if (!body.accessToken || !body.refreshToken) {
    throw new Error("Login response missing tokens");
  }
  const expiresInSec = body.expiresIn ?? 3600;
  return {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    expiresAt: Date.now() + expiresInSec * 1000,
  };
}

export async function loginOperator(request: APIRequestContext): Promise<string> {
  const session = await loginOperatorSession(request);
  return session.accessToken;
}

export async function seedOperatorAuthSession(
  page: import("@playwright/test").Page,
  session: OperatorSession
): Promise<void> {
  await page.addInitScript((stored) => {
    localStorage.setItem("auth_session", JSON.stringify(stored));
  }, session);
}

export async function findActivityIdBySlug(
  request: APIRequestContext,
  token: string,
  slug: string
): Promise<string> {
  for (let page = 1; page <= 5; page += 1) {
    const response = await request.get(
      `${API_BASE}/api/v1/admin/activities?page=${page}&pageSize=50`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Host: tenantHostHeader(),
        },
      }
    );
    if (!response.ok()) {
      throw new Error(`List activities failed: ${response.status()}`);
    }
    const body = (await response.json()) as {
      items?: Array<{ id: string; slug: string; status?: string }>;
      totalCount?: number;
    };
    const match = body.items?.find((item) => item.slug === slug);
    if (match) {
      return match.id;
    }
    const loaded = page * 50;
    if (!body.items?.length || (body.totalCount != null && loaded >= body.totalCount)) {
      break;
    }
  }

  throw new Error(`Activity slug not found: ${slug}`);
}

export async function resolvePublishedE2eSlug(
  request: APIRequestContext,
  token: string,
  preferredSlug: string
): Promise<string> {
  try {
    await findActivityIdBySlug(request, token, preferredSlug);
    return preferredSlug;
  } catch {
    const response = await request.get(`${API_BASE}/api/v1/admin/activities?page=1&pageSize=50`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Host: tenantHostHeader(),
      },
    });
    if (!response.ok()) {
      throw new Error(`List activities failed: ${response.status()}`);
    }
    const body = (await response.json()) as {
      items?: Array<{ slug: string; status?: string }>;
    };
    const published = body.items?.find((item) => item.status === "published");
    if (!published) {
      throw new Error("No published activity available for Epic 35 e2e.");
    }
    return published.slug;
  }
}

export async function applyRegistrationTheme(
  request: APIRequestContext,
  token: string,
  activityId: string,
  activity: Record<string, unknown>,
  theme: ExperienceFixture["theme"]
): Promise<void> {
  const payload = {
    name: activity.name,
    category: activity.category,
    schedule: activity.schedule,
    location: activity.location,
    communityLabel: activity.communityLabel,
    heroImageUrl: activity.heroImageUrl ?? null,
    accentColor: activity.accentColor ?? null,
    maxRegistrants: activity.maxRegistrants ?? null,
    registrationTheme: theme,
  };

  const response = await request.put(`${API_BASE}/api/v1/admin/activities/${activityId}`, {
    data: payload,
    headers: {
      Authorization: `Bearer ${token}`,
      Host: "default.localhost",
    },
  });
  if (!response.ok()) {
    throw new Error(`Update activity theme failed: ${response.status()} ${await response.text()}`);
  }
}

export async function fetchActivity(
  request: APIRequestContext,
  token: string,
  activityId: string
): Promise<Record<string, unknown>> {
  const response = await request.get(`${API_BASE}/api/v1/admin/activities/${activityId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Host: "default.localhost",
    },
  });
  if (!response.ok()) {
    throw new Error(`Get activity failed: ${response.status()}`);
  }
  return (await response.json()) as Record<string, unknown>;
}
