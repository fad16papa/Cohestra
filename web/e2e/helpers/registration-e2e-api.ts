import { expect, type APIRequestContext } from "@playwright/test";

import { DEFAULT_TENANT_SLUG, resolveE2eApiBase, tenantApiHost, tenantWebOrigin } from "./owned-fixture-data";

const API_BASE = resolveE2eApiBase();
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
    designTokens?: {
      typographyScale?: string | null;
      fieldSize?: string | null;
      fieldRadius?: string | null;
      buttonWidth?: string | null;
      surfaceEmphasis?: string | null;
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

export function tenantWebBase(slug = DEFAULT_TENANT_SLUG): string {
  return tenantWebOrigin(slug);
}

function tenantHostHeader(slug = DEFAULT_TENANT_SLUG): string {
  return tenantApiHost(slug, API_BASE);
}

export type OperatorSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export async function loginOperatorSession(
  request: APIRequestContext,
  options?: { slug?: string; email?: string; password?: string }
): Promise<OperatorSession> {
  const email = options?.email ?? OPERATOR_EMAIL;
  const password = options?.password ?? OPERATOR_PASSWORD;
  const slug = options?.slug ?? DEFAULT_TENANT_SLUG;
  const response = await request.post(`${API_BASE}/api/v1/auth/login`, {
    data: { email, password },
    headers: { Host: tenantHostHeader(slug) },
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
  const raw = body as {
    expiresIn?: number;
    expiresInSeconds?: number;
    ExpiresInSeconds?: number;
  };
  const expiresInSec =
    raw.expiresInSeconds ?? raw.ExpiresInSeconds ?? raw.expiresIn ?? 3600;
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

/** Wait until admin shell is past auth guard (not login redirect). */
export async function waitForOperatorWorkspace(
  page: import("@playwright/test").Page
): Promise<void> {
  await page.waitForFunction(
    () =>
      !window.location.pathname.includes("/login") &&
      !document.body.textContent?.includes("Loading admin workspace"),
    undefined,
    { timeout: 60_000 }
  );
}

/** Experience layout cards use sr-only radios — click the visible label card. */
export async function selectExperienceLayoutLabel(
  page: import("@playwright/test").Page,
  layoutLabel: RegExp
): Promise<void> {
  const card = page.locator("label").filter({ hasText: layoutLabel }).first();
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.click();
}

export async function openActivityTab(
  page: import("@playwright/test").Page,
  activityId: string,
  tab: "overview" | "design" | "form" | "registrations" | "share",
  session: OperatorSession,
  webBase = tenantWebBase()
): Promise<void> {
  const base = webBase;
  await seedOperatorAuthSession(page, session);
  await page.goto(`${base}/activities/${activityId}?tab=${tab}`, {
    waitUntil: "domcontentloaded",
  });
  if (page.url().includes("/login")) {
    await page.evaluate((stored) => {
      localStorage.setItem("auth_session", JSON.stringify(stored));
    }, session);
    await page.goto(`${base}/activities/${activityId}?tab=${tab}`, {
      waitUntil: "domcontentloaded",
    });
  }
  await waitForOperatorWorkspace(page);
  const tabPattern =
    tab === "form"
      ? /^Form$/
      : tab === "design"
        ? /^Design$/
        : new RegExp(tab, "i");
  await expect(page.getByRole("tab", { name: tabPattern, selected: true })).toBeVisible({
    timeout: 30_000,
  });
}

export async function findActivityIdBySlug(
  request: APIRequestContext,
  token: string,
  slug: string,
  tenantSlug = DEFAULT_TENANT_SLUG
): Promise<string> {
  const searched = await request.get(
    `${API_BASE}/api/v1/admin/activities?search=${encodeURIComponent(slug)}&page=1&pageSize=50`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Host: tenantHostHeader(tenantSlug),
      },
    }
  );
  if (searched.ok()) {
    const searchedBody = (await searched.json()) as {
      items?: Array<{ id: string; slug: string }>;
    };
    const exact = searchedBody.items?.find((item) => item.slug === slug);
    if (exact) {
      return exact.id;
    }
  }

  for (let page = 1; page <= 5; page += 1) {
    const response = await request.get(
      `${API_BASE}/api/v1/admin/activities?page=${page}&pageSize=50`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Host: tenantHostHeader(tenantSlug),
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
        Host: tenantHostHeader(DEFAULT_TENANT_SLUG),
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
  theme: ExperienceFixture["theme"],
  tenantSlug = DEFAULT_TENANT_SLUG
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
      Host: tenantHostHeader(tenantSlug),
    },
  });
  if (!response.ok()) {
    throw new Error(`Update activity theme failed: ${response.status()} ${await response.text()}`);
  }
}

export async function createDraftActivity(
  request: APIRequestContext,
  token: string,
  slugPrefix: string,
  tenantSlug = DEFAULT_TENANT_SLUG
): Promise<{ id: string; slug: string }> {
  const slug = `${slugPrefix}-${Date.now().toString(36)}`.slice(0, 24);
  const response = await request.post(`${API_BASE}/api/v1/admin/activities`, {
    data: {
      name: `E2E Columns ${slug}`,
      category: "Social",
      schedule: "Sat 10:00",
      location: "Online",
      communityLabel: "Riverside Runners",
      status: "draft",
    },
    headers: {
      Authorization: `Bearer ${token}`,
      Host: tenantHostHeader(tenantSlug),
    },
  });
  if (!response.ok()) {
    throw new Error(`Create activity failed: ${response.status()} ${await response.text()}`);
  }
  const body = (await response.json()) as { id: string; slug: string };
  return { id: body.id, slug: body.slug };
}

export async function saveActivityFormSchema(
  request: APIRequestContext,
  token: string,
  activityId: string,
  formSchema: Record<string, unknown>,
  tenantSlug = DEFAULT_TENANT_SLUG
): Promise<void> {
  const response = await request.put(
    `${API_BASE}/api/v1/admin/activities/${activityId}/form-schema`,
    {
      data: JSON.stringify({ formSchema }),
      headers: {
        Authorization: `Bearer ${token}`,
        Host: tenantHostHeader(tenantSlug),
        "Content-Type": "application/json",
      },
    }
  );
  if (!response.ok()) {
    throw new Error(`Save form schema failed: ${response.status()} ${await response.text()}`);
  }
}

export async function publishActivity(
  request: APIRequestContext,
  token: string,
  activityId: string,
  tenantSlug = DEFAULT_TENANT_SLUG
): Promise<void> {
  const response = await request.post(
    `${API_BASE}/api/v1/admin/activities/${activityId}/publish`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Host: tenantHostHeader(tenantSlug),
      },
    }
  );
  if (!response.ok()) {
    throw new Error(`Publish activity failed: ${response.status()} ${await response.text()}`);
  }
}

export async function fetchActivity(
  request: APIRequestContext,
  token: string,
  activityId: string,
  tenantSlug = DEFAULT_TENANT_SLUG
): Promise<Record<string, unknown>> {
  const response = await request.get(`${API_BASE}/api/v1/admin/activities/${activityId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Host: tenantHostHeader(tenantSlug),
    },
  });
  if (!response.ok()) {
    throw new Error(`Get activity failed: ${response.status()}`);
  }
  return (await response.json()) as Record<string, unknown>;
}
