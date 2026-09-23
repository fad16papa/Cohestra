import { expect, type APIRequestContext } from "@playwright/test";

import {
  applyRegistrationTheme,
  fetchActivity,
  findActivityIdBySlug,
  loginOperatorSession,
  openActivityTab,
  publishActivity,
  saveActivityFormSchema,
  type OperatorSession,
} from "./registration-e2e-api";
import {
  BASIC_TENANT_SLUG,
  CANONICAL_DEMO_SLUGS,
  DEFAULT_TENANT_SLUG,
  MARINA_LIKE_FORM_SCHEMA,
  SINGLE_PAGE_CENTERED_THEME,
  isCanonicalDemoSlug,
  isOwnedFixtureName,
  ownedActivityName,
  resolveE2eApiBase,
  tenantApiHost,
  tenantWebOrigin,
} from "./owned-fixture-data";

export type OwnedTenant = {
  slug: string;
  email: string;
  password: string;
};

export const DEFAULT_PRO_TENANT: OwnedTenant = {
  slug: DEFAULT_TENANT_SLUG,
  email: process.env.E2E_OPERATOR_EMAIL ?? "operator@cohestra.local",
  password: process.env.E2E_OPERATOR_PASSWORD ?? "ChangeMe123!",
};

export const PX2_BASIC_TENANT: OwnedTenant = {
  slug: BASIC_TENANT_SLUG,
  email: process.env.E2E_BASIC_EMAIL ?? "px2-basic-admin@cohestra.local",
  password: process.env.E2E_BASIC_PASSWORD ?? "ChangeMe123!",
};

export type OwnedActivity = {
  id: string;
  slug: string;
  name: string;
  tenant: OwnedTenant;
  record: Record<string, unknown>;
};

function apiHeaders(token: string, tenantSlug: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Host: tenantApiHost(tenantSlug),
  };
}

async function readJson(response: { ok: () => boolean; status: () => number; json: () => Promise<unknown>; text: () => Promise<string> }, label: string) {
  if (!response.ok()) {
    throw new Error(`${label} failed: ${response.status()} ${await response.text()}`);
  }
  return response.json();
}

export async function loginOwnedTenant(
  request: APIRequestContext,
  tenant: OwnedTenant
): Promise<OperatorSession> {
  try {
    return await loginOperatorSession(request, {
      slug: tenant.slug,
      email: tenant.email,
      password: tenant.password,
    });
  } catch (error) {
    if (tenant.slug === BASIC_TENANT_SLUG) {
      throw new Error(
        `${error instanceof Error ? error.message : String(error)} ` +
          "Basic fixture tenant is missing. Development DemoDataSeed must provision px2-basic " +
          "(E2eEntitlementFixtureSeeder) — do not SQL-flip default.Plan."
      );
    }
    throw error;
  }
}

async function listNamed(
  request: APIRequestContext,
  token: string,
  tenantSlug: string,
  path: string
): Promise<Array<{ id: string; name: string }>> {
  const response = await request.get(`${resolveE2eApiBase()}${path}`, {
    headers: apiHeaders(token, tenantSlug),
  });
  const body = (await readJson(response, `GET ${path}`)) as {
    items?: Array<{ id?: string; name?: string }>;
  };
  return (body.items ?? [])
    .filter((item): item is { id: string; name: string } =>
      typeof item.id === "string" && typeof item.name === "string"
    );
}

async function ensureCatalog(
  request: APIRequestContext,
  token: string,
  tenant: OwnedTenant
): Promise<{ community: string; category: string }> {
  const communities = await listNamed(
    request,
    token,
    tenant.slug,
    "/api/v1/admin/communities"
  );
  let community = communities[0]?.name;
  if (!community) {
    const created = await request.post(`${resolveE2eApiBase()}/api/v1/admin/communities`, {
      data: { name: "E2E Community" },
      headers: apiHeaders(token, tenant.slug),
    });
    if (!created.ok()) {
      const retry = await listNamed(request, token, tenant.slug, "/api/v1/admin/communities");
      community = retry[0]?.name;
      if (!community) {
        throw new Error(`Create community failed: ${created.status()} ${await created.text()}`);
      }
    } else {
      const body = (await created.json()) as { name?: string };
      community = body.name ?? "E2E Community";
    }
  }

  const categories = await listNamed(
    request,
    token,
    tenant.slug,
    "/api/v1/admin/categories"
  );
  let category = categories[0]?.name;
  if (!category) {
    const created = await request.post(`${resolveE2eApiBase()}/api/v1/admin/categories`, {
      data: { name: "Social" },
      headers: apiHeaders(token, tenant.slug),
    });
    if (!created.ok()) {
      const retry = await listNamed(request, token, tenant.slug, "/api/v1/admin/categories");
      category = retry[0]?.name;
      if (!category) {
        throw new Error(`Create category failed: ${created.status()} ${await created.text()}`);
      }
    } else {
      const body = (await created.json()) as { name?: string };
      category = body.name ?? "Social";
    }
  }

  return { community, category };
}

async function findActivityByName(
  request: APIRequestContext,
  token: string,
  tenantSlug: string,
  name: string
): Promise<{ id: string; slug: string; name: string } | null> {
  const response = await request.get(
    `${resolveE2eApiBase()}/api/v1/admin/activities?search=${encodeURIComponent(name)}&page=1&pageSize=50`,
    { headers: apiHeaders(token, tenantSlug) }
  );
  const body = (await readJson(response, "Search activities")) as {
    items?: Array<{ id?: string; slug?: string; name?: string; status?: string }>;
  };
  const match = body.items?.find(
    (item) => item.name === name && item.status !== "archived"
  );
  if (!match?.id || !match.slug || !match.name) {
    return null;
  }
  return { id: match.id, slug: match.slug, name: match.name };
}

export async function provisionOwnedActivity(
  request: APIRequestContext,
  session: OperatorSession,
  options: {
    ownerKey: string;
    workerIndex: number;
    tenant?: OwnedTenant;
    theme?: typeof SINGLE_PAGE_CENTERED_THEME | Record<string, unknown>;
    formSchema?: Record<string, unknown>;
    publish?: boolean;
  }
): Promise<OwnedActivity> {
  const tenant = options.tenant ?? DEFAULT_PRO_TENANT;
  if (options.workerIndex == null) {
    throw new Error("workerIndex is required so parallel workers do not share a fixture.");
  }
  const name = ownedActivityName(options.ownerKey, options.workerIndex);
  if (isCanonicalDemoSlug(name)) {
    throw new Error("Owned fixture name collided with a canonical demo slug.");
  }

  const catalog = await ensureCatalog(request, session.accessToken, tenant);
  const existing = await findActivityByName(
    request,
    session.accessToken,
    tenant.slug,
    name
  );

  let id: string;
  let slug: string;
  if (existing) {
    id = existing.id;
    slug = existing.slug;
  } else {
    const created = await request.post(`${resolveE2eApiBase()}/api/v1/admin/activities`, {
      data: {
        name,
        category: catalog.category,
        schedule: "Sat 10:00",
        location: "Online",
        communityLabel: catalog.community,
        status: "draft",
      },
      headers: apiHeaders(session.accessToken, tenant.slug),
    });
    const body = (await readJson(created, "Create owned activity")) as {
      id: string;
      slug: string;
    };
    id = body.id;
    slug = body.slug;
  }

  if (isCanonicalDemoSlug(slug)) {
    throw new Error(`Owned fixture resolved to canonical slug ${slug}.`);
  }

  const schema = options.formSchema ?? MARINA_LIKE_FORM_SCHEMA;
  await saveActivityFormSchema(request, session.accessToken, id, schema, tenant.slug);

  let record = await fetchActivity(request, session.accessToken, id, tenant.slug);
  const theme = options.theme ?? SINGLE_PAGE_CENTERED_THEME;
  await applyRegistrationTheme(
    request,
    session.accessToken,
    id,
    record,
    theme as Parameters<typeof applyRegistrationTheme>[4],
    tenant.slug
  );

  if (options.publish) {
    const status = String(record.status ?? record.Status ?? "").toLowerCase();
    if (status !== "published") {
      await publishActivity(request, session.accessToken, id, tenant.slug);
    }
    record = await fetchActivity(request, session.accessToken, id, tenant.slug);
  } else {
    record = await fetchActivity(request, session.accessToken, id, tenant.slug);
  }

  return { id, slug, name, tenant, record };
}

export async function openOwnedActivityTab(
  page: import("@playwright/test").Page,
  activity: OwnedActivity,
  tab: "overview" | "design" | "form" | "registrations" | "share",
  session: OperatorSession
): Promise<void> {
  await openActivityTab(page, activity.id, tab, session, tenantWebOrigin(activity.tenant.slug));
}

export async function archiveOwnedActivity(
  request: APIRequestContext,
  session: OperatorSession,
  activity: OwnedActivity
): Promise<void> {
  if (!isOwnedFixtureName(activity.name)) {
    throw new Error(`Refusing to archive non-owned activity ${activity.name}`);
  }
  const response = await request.post(
    `${resolveE2eApiBase()}/api/v1/admin/activities/${activity.id}/archive`,
    { headers: apiHeaders(session.accessToken, activity.tenant.slug) }
  );
  if (!response.ok() && response.status() !== 404) {
    throw new Error(`Archive owned activity failed: ${response.status()} ${await response.text()}`);
  }
}

export type CanonicalSnapshot = {
  slug: string;
  status: string;
  theme: unknown;
  formSchema: unknown;
};

export async function snapshotCanonicalDemos(
  request: APIRequestContext,
  token: string,
  tenantSlug = DEFAULT_TENANT_SLUG
): Promise<CanonicalSnapshot[]> {
  const snapshots: CanonicalSnapshot[] = [];
  for (const slug of CANONICAL_DEMO_SLUGS) {
    const id = await findActivityIdBySlug(request, token, slug, tenantSlug);
    const record = await fetchActivity(request, token, id, tenantSlug);
    snapshots.push({
      slug,
      status: String(record.status ?? record.Status ?? ""),
      theme: record.registrationTheme ?? record.RegistrationTheme ?? null,
      formSchema: record.formSchema ?? record.FormSchema ?? null,
    });
  }
  return snapshots;
}

export function assertCanonicalSnapshotsEqual(
  before: CanonicalSnapshot[],
  after: CanonicalSnapshot[]
): void {
  expect(after).toEqual(before);
}

export async function fetchTenantPlan(
  request: APIRequestContext,
  session: OperatorSession,
  tenantSlug: string
): Promise<string> {
  const response = await request.get(`${resolveE2eApiBase()}/api/v1/admin/shell`, {
    headers: apiHeaders(session.accessToken, tenantSlug),
  });
  const body = (await readJson(response, "GET /admin/shell")) as {
    plan?: string;
    Plan?: string;
  };
  const plan = body.plan ?? body.Plan;
  if (!plan) {
    throw new Error("Shell response missing plan");
  }
  return plan;
}
