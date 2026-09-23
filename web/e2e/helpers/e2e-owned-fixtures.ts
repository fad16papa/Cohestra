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
  extractCanonicalTheme,
  isCanonicalDemoSlug,
  ownedActivityName,
  preferOwnedActivityMatch,
  resolveE2eApiBase,
  slugifyOwnedName,
  tenantApiHost,
  tenantWebOrigin,
  type CanonicalSnapshot,
} from "./owned-fixture-data";

export type { CanonicalSnapshot, CanonicalThemeFields } from "./owned-fixture-data";

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

async function findActivitiesByName(
  request: APIRequestContext,
  token: string,
  tenantSlug: string,
  name: string
): Promise<Array<{ id: string; slug: string; name: string }>> {
  const response = await request.get(
    `${resolveE2eApiBase()}/api/v1/admin/activities?search=${encodeURIComponent(name)}&page=1&pageSize=50`,
    { headers: apiHeaders(token, tenantSlug) }
  );
  const body = (await readJson(response, "Search activities")) as {
    items?: Array<{ id?: string; slug?: string; name?: string; status?: string }>;
  };
  return (body.items ?? []).filter(
    (item): item is { id: string; slug: string; name: string } =>
      item.name === name &&
      item.status !== "archived" &&
      typeof item.id === "string" &&
      typeof item.slug === "string" &&
      typeof item.name === "string"
  );
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
  const expectedSlug = slugifyOwnedName(name);
  const resolveMatch = async () =>
    preferOwnedActivityMatch(
      await findActivitiesByName(request, session.accessToken, tenant.slug, name),
      expectedSlug
    );

  let existing = await resolveMatch();
  if (!existing) {
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
    if (!created.ok()) {
      existing = await resolveMatch();
      if (!existing) {
        throw new Error(`Create owned activity failed: ${created.status()} ${await created.text()}`);
      }
    } else {
      const body = (await created.json()) as { id: string; slug: string };
      existing = (await resolveMatch()) ?? { id: body.id, slug: body.slug, name };
    }
  }

  const id = existing.id;
  const slug = existing.slug;

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
      name: String(record.name ?? record.Name ?? ""),
      status: String(record.status ?? record.Status ?? ""),
      category: String(record.category ?? record.Category ?? ""),
      communityLabel: String(record.communityLabel ?? record.CommunityLabel ?? ""),
      maxRegistrants: record.maxRegistrants ?? record.MaxRegistrants ?? null,
      showOnHomepage: record.showOnHomepage ?? record.ShowOnHomepage ?? null,
      theme: extractCanonicalTheme(record),
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
