import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  assertMutationTarget,
  buildDisposableSlug,
  evaluateEnvironmentGate,
  exclusivePlatformAdminRoles,
  isAllowedLifecycleUrl,
  pinFromCreateResponse,
  refuseExternalTenantId,
  tenantOrigin,
  type LifecyclePin,
} from "./guards.ts";

export const EXIT = {
  ok: 0,
  needsBootstrap: 78,
  bootstrapConflict: 79,
  credentialsMissing: 81,
  fail: 1,
} as const;

export type LifecycleEvidence = {
  result: "pass" | "skip" | "fail" | "owner_gate";
  ownerGate?: string;
  reason?: string;
  targetSha?: string;
  tenantId?: string;
  tenantSlug?: string;
  plan?: string;
  complimentary?: boolean;
  billing?: string;
  create?: Record<string, unknown>;
  suspend?: Record<string, unknown>;
  maintenance?: Record<string, unknown>;
  reactivate?: Record<string, unknown>;
  archive?: Record<string, unknown>;
  archived404?: Record<string, unknown>;
  audits?: string[];
  platformAdminAuth?: string;
  roleExclusivity?: string;
  paddleMutation?: "NONE";
};

type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export type LifecycleEnv = {
  UAT_AUTO_LIFECYCLE_ENABLED?: string;
  UAT_PUBLIC_BASE_URL?: string;
  UAT_AUTO_PLATFORM_ADMIN_EMAIL?: string;
  UAT_AUTO_PLATFORM_ADMIN_PASSWORD?: string;
  TARGET_SHA?: string;
  GITHUB_RUN_ID?: string;
  GITHUB_ENVIRONMENT?: string;
  LIFECYCLE_BOOTSTRAP_ATTEMPTED?: string;
  LIFECYCLE_GATE_PATH?: string;
  LIFECYCLE_EVIDENCE_PATH?: string;
  [key: string]: string | undefined;
};

function jsonHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json",
    "x-forwarded-host": "uat.cohestra.app",
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  return headers;
}

function readGateFile(path: string): boolean {
  const raw = JSON.parse(readFileSync(path, "utf8")) as { lifecycleOpen?: boolean };
  return raw.lifecycleOpen === true;
}

function writeEvidence(path: string, evidence: LifecycleEvidence): void {
  mkdirSync(dirname(path), { recursive: true });
  const serialized = JSON.stringify(evidence, null, 2);
  if (/(password|authorization|bearer\s+[a-z0-9._-]+|pdl_|whsec_)/i.test(serialized)) {
    throw new Error("REFUSE: lifecycle evidence contained a secret-like value");
  }
  writeFileSync(path, `${serialized}\n`, { mode: 0o600 });
}

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function runLifecycle(env: LifecycleEnv, fetchImpl: FetchFn = fetch): Promise<{
  code: number;
  evidence: LifecycleEvidence;
}> {
  const evidencePath = env.LIFECYCLE_EVIDENCE_PATH ?? "artifacts/19-5-lifecycle.json";
  const publicBaseUrl = env.UAT_PUBLIC_BASE_URL || "https://uat.cohestra.app";
  let lifecycleOpen = false;
  try {
    lifecycleOpen = readGateFile(env.LIFECYCLE_GATE_PATH ?? "_bmad-output/implementation-artifacts/19-5-lifecycle-gate.json");
  } catch {
    lifecycleOpen = false;
  }

  const gate = evaluateEnvironmentGate({
    lifecycleEnabled: env.UAT_AUTO_LIFECYCLE_ENABLED,
    lifecycleOpen,
    publicBaseUrl,
    targetSha: env.TARGET_SHA,
    email: env.UAT_AUTO_PLATFORM_ADMIN_EMAIL,
    password: env.UAT_AUTO_PLATFORM_ADMIN_PASSWORD,
    githubEnvironment: env.GITHUB_ENVIRONMENT ?? "uat",
  });

  if (gate === "lifecycle_disabled" || gate === "story_closed") {
    const evidence: LifecycleEvidence = { result: "skip", reason: gate, paddleMutation: "NONE" };
    writeEvidence(evidencePath, evidence);
    return { code: EXIT.ok, evidence };
  }

  if (gate === "missing_credentials") {
    const evidence: LifecycleEvidence = {
      result: "owner_gate",
      ownerGate: "platform_admin_credentials_missing",
      paddleMutation: "NONE",
    };
    writeEvidence(evidencePath, evidence);
    return { code: EXIT.credentialsMissing, evidence };
  }

  if (gate) {
    const evidence: LifecycleEvidence = { result: "fail", reason: gate, paddleMutation: "NONE" };
    writeEvidence(evidencePath, evidence);
    return { code: EXIT.fail, evidence };
  }

  const externalId = refuseExternalTenantId(env);
  if (externalId) {
    const evidence: LifecycleEvidence = { result: "fail", reason: externalId, paddleMutation: "NONE" };
    writeEvidence(evidencePath, evidence);
    return { code: EXIT.fail, evidence };
  }

  const targetSha = env.TARGET_SHA as string;
  let pin: LifecyclePin | null = null;

  const guardedFetch: FetchFn = async (input, init) => {
    const method = (init?.method ?? "GET").toUpperCase();
    if (!isAllowedLifecycleUrl(input, pin, method)) {
      throw new Error("REFUSE: disallowed lifecycle URL");
    }
    return fetchImpl(input, { ...init, redirect: init?.redirect ?? "manual" });
  };

  const login = await guardedFetch(`${publicBaseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      email: env.UAT_AUTO_PLATFORM_ADMIN_EMAIL,
      password: env.UAT_AUTO_PLATFORM_ADMIN_PASSWORD,
    }),
  });

  if (login.status === 401 || login.status === 403) {
    if (env.LIFECYCLE_BOOTSTRAP_ATTEMPTED === "true") {
      const evidence: LifecycleEvidence = {
        result: "owner_gate",
        ownerGate: "platform_admin_credentials_missing",
        platformAdminAuth: "FAIL",
        paddleMutation: "NONE",
      };
      writeEvidence(evidencePath, evidence);
      return { code: EXIT.credentialsMissing, evidence };
    }
    const evidence: LifecycleEvidence = {
      result: "owner_gate",
      ownerGate: "platform_admin_bootstrap_required",
      platformAdminAuth: "FAIL",
      paddleMutation: "NONE",
    };
    writeEvidence(evidencePath, evidence);
    return { code: EXIT.needsBootstrap, evidence };
  }

  const loginBody = await readJson(login);
  const accessToken = typeof loginBody?.accessToken === "string" ? loginBody.accessToken : "";
  if (!login.ok || !accessToken) {
    const evidence: LifecycleEvidence = {
      result: "fail",
      reason: "login_failed",
      platformAdminAuth: "FAIL",
      paddleMutation: "NONE",
    };
    writeEvidence(evidencePath, evidence);
    return { code: EXIT.fail, evidence };
  }

  const me = await guardedFetch(`${publicBaseUrl}/api/v1/platform/me`, {
    headers: jsonHeaders(accessToken),
  });
  const meBody = await readJson(me);
  const roles = Array.isArray(meBody?.roles) ? meBody.roles.map(String) : [];
  if (!me.ok || !exclusivePlatformAdminRoles(roles)) {
    const evidence: LifecycleEvidence = {
      result: "owner_gate",
      ownerGate: "platform_admin_bootstrap_conflict",
      platformAdminAuth: me.ok ? "PASS" : "FAIL",
      roleExclusivity: "FAIL",
      paddleMutation: "NONE",
    };
    writeEvidence(evidencePath, evidence);
    return { code: EXIT.bootstrapConflict, evidence };
  }

  const slug = buildDisposableSlug(targetSha, env.GITHUB_RUN_ID);
  const create = await guardedFetch(`${publicBaseUrl}/api/v1/platform/tenants`, {
    method: "POST",
    headers: jsonHeaders(accessToken),
    body: JSON.stringify({
      name: "Story 19.5 lifecycle",
      slug,
      plan: "Basic",
      adminContactEmail: `lifecycle.${slug}@uat.cohestra.invalid`,
      isComplimentary: true,
    }),
  });
  const created = await readJson(create);
  if (create.status !== 201 || !created) {
    const evidence: LifecycleEvidence = {
      result: "fail",
      reason: "create_failed",
      platformAdminAuth: "PASS",
      roleExclusivity: "PASS",
      create: { http: create.status },
      paddleMutation: "NONE",
    };
    writeEvidence(evidencePath, evidence);
    return { code: EXIT.fail, evidence };
  }

  pin = pinFromCreateResponse(String(created.id), String(created.slug));
  const origin = tenantOrigin(publicBaseUrl, pin.slug);

  const activeOk =
    created.status === "Active" &&
    created.plan === "Basic" &&
    created.billingStatus === "Free" &&
    created.isComplimentary === true;

  const doorActive = await readPublicDoor(guardedFetch, origin);
  const homeActive = await readPublicHome(guardedFetch, origin);

  const suspend = await mutate(guardedFetch, publicBaseUrl, accessToken, pin, "suspend", {
    reason: "Story 19.5 UAT lifecycle acceptance",
  });
  const doorSuspended = await readPublicDoor(guardedFetch, origin);
  const homeSuspended = await readPublicHome(guardedFetch, origin);

  const reactivate = await mutate(guardedFetch, publicBaseUrl, accessToken, pin, "reactivate");
  const doorReactivated = await readPublicDoor(guardedFetch, origin);
  const homeReactivated = await readPublicHome(guardedFetch, origin);

  const archive = await mutate(guardedFetch, publicBaseUrl, accessToken, pin, "archive");
  const doorArchived = await readPublicDoor(guardedFetch, origin);
  const homeArchived = await readPublicHome(guardedFetch, origin);

  const audits = await readAudits(guardedFetch, publicBaseUrl, accessToken, pin);

  const maintenancePass =
    suspend.body?.status === "Suspended" &&
    doorSuspended.kind === "suspended" &&
    homeSuspended.status === 200 &&
    /paused/i.test(homeSuspended.text);
  const archive404Pass =
    archive.body?.status === "Archived" &&
    archive.body?.archivedAt != null &&
    homeArchived.status === 404;
  const reactivatePass =
    reactivate.body?.status === "Active" &&
    doorReactivated.kind === "active" &&
    !/paused/i.test(homeReactivated.text);

  const pass =
    activeOk &&
    doorActive.kind === "active" &&
    homeActive.status === 200 &&
    maintenancePass &&
    reactivatePass &&
    archive404Pass &&
    audits.includes("TenantCreated") &&
    audits.includes("TenantSuspended") &&
    audits.includes("TenantReactivated") &&
    audits.includes("TenantArchived");

  const evidence: LifecycleEvidence = {
    result: pass ? "pass" : "fail",
    targetSha,
    tenantId: pin.tenantId,
    tenantSlug: pin.slug,
    plan: "Basic",
    complimentary: true,
    billing: "Free",
    platformAdminAuth: "PASS",
    roleExclusivity: "PASS",
    create: { http: create.status, status: created.status, plan: created.plan, billingStatus: created.billingStatus, isComplimentary: created.isComplimentary },
    suspend: { http: suspend.status, status: suspend.body?.status },
    maintenance: { http: homeSuspended.status, kind: doorSuspended.kind, pausedCopy: /paused/i.test(homeSuspended.text) },
    reactivate: { http: reactivate.status, status: reactivate.body?.status, kind: doorReactivated.kind },
    archive: { http: archive.status, status: archive.body?.status, archivedAtPresent: archive.body?.archivedAt != null },
    archived404: { http: homeArchived.status, kind: doorArchived.kind },
    audits,
    paddleMutation: "NONE",
    reason: pass ? undefined : "lifecycle_assertion_failed",
  };
  writeEvidence(evidencePath, evidence);
  return { code: pass ? EXIT.ok : EXIT.fail, evidence };
}

async function mutate(
  fetchImpl: FetchFn,
  publicBaseUrl: string,
  token: string,
  pin: LifecyclePin,
  action: "suspend" | "reactivate" | "archive",
  body?: Record<string, string>,
): Promise<{ status: number; body: Record<string, unknown> | null }> {
  const refused = assertMutationTarget(pin, pin.tenantId, pin.slug);
  if (refused) {
    throw new Error(`REFUSE: ${refused}`);
  }
  const response = await fetchImpl(`${publicBaseUrl}/api/v1/platform/tenants/${pin.tenantId}/${action}`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await readJson(response) };
}

async function readPublicDoor(fetchImpl: FetchFn, origin: string): Promise<{ kind: string | null }> {
  const response = await fetchImpl(`${origin}/api/v1/public/door`, { headers: { accept: "application/json" } });
  const body = await readJson(response);
  return { kind: typeof body?.kind === "string" ? body.kind : null };
}

async function readPublicHome(fetchImpl: FetchFn, origin: string): Promise<{ status: number; text: string }> {
  const response = await fetchImpl(`${origin}/`, { headers: { accept: "text/html" } });
  const text = await response.text();
  return { status: response.status, text };
}

async function readAudits(
  fetchImpl: FetchFn,
  publicBaseUrl: string,
  token: string,
  pin: LifecyclePin,
): Promise<string[]> {
  const actions = ["TenantCreated", "TenantSuspended", "TenantReactivated", "TenantArchived"];
  const found: string[] = [];
  for (const action of actions) {
    const response = await fetchImpl(
      `${publicBaseUrl}/api/v1/platform/audits?tenantId=${pin.tenantId}&action=${action}&pageSize=5`,
      { headers: jsonHeaders(token) },
    );
    const body = await readJson(response);
    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.some((item) => item && typeof item === "object" && (item as { action?: string }).action === action)) {
      found.push(action);
    }
  }
  return found;
}
