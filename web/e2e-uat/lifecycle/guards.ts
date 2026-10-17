export const LIFECYCLE_SLUG_PREFIX = "uat-19-5-lifecycle-";
export const PROTECTED_SLUGS = ["default", "picklemania", "creativorare"] as const;
export const TENANT_ROLES = ["TenantAdmin", "TenantMember", "Admin"] as const;

export type LifecycleGateReason =
  | "lifecycle_disabled"
  | "story_closed"
  | "production_host"
  | "missing_credentials"
  | "missing_target_sha"
  | "unpinned_target_sha"
  | "protected_slug"
  | "missing_lifecycle_prefix"
  | "unpinned_tenant"
  | "external_tenant_id"
  | "billing_path"
  | "disallowed_url";

export type LifecyclePin = {
  tenantId: string;
  slug: string;
};

export type LifecycleGateInput = {
  lifecycleEnabled: string | undefined;
  lifecycleOpen: boolean;
  publicBaseUrl: string | undefined;
  targetSha: string | undefined;
  email: string | undefined;
  password: string | undefined;
  githubEnvironment?: string;
};

export function isExactTrue(value: string | undefined): boolean {
  return value === "true";
}

export function isFullSha(value: string | undefined): value is string {
  return typeof value === "string" && /^[0-9a-fA-F]{40}$/.test(value);
}

export function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export function isProtectedSlug(slug: string): boolean {
  return (PROTECTED_SLUGS as readonly string[]).includes(normalizeSlug(slug));
}

export function hasLifecyclePrefix(slug: string): boolean {
  return normalizeSlug(slug).startsWith(LIFECYCLE_SLUG_PREFIX);
}

export function isUatPublicBase(publicBaseUrl: string | undefined): boolean {
  if (!publicBaseUrl) {
    return false;
  }

  try {
    const url = new URL(publicBaseUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return false;
    }
    const host = url.hostname.toLowerCase();
    return host === "uat.cohestra.app" || host === "www.uat.cohestra.app";
  } catch {
    return false;
  }
}

export function evaluateEnvironmentGate(input: LifecycleGateInput): LifecycleGateReason | null {
  if (!isExactTrue(input.lifecycleEnabled)) {
    return "lifecycle_disabled";
  }
  if (!input.lifecycleOpen) {
    return "story_closed";
  }
  if (input.githubEnvironment && input.githubEnvironment !== "uat") {
    return "production_host";
  }
  if (!isUatPublicBase(input.publicBaseUrl)) {
    return "production_host";
  }
  if (!isFullSha(input.targetSha)) {
    return input.targetSha ? "unpinned_target_sha" : "missing_target_sha";
  }
  if (!input.email?.trim() || !input.password) {
    return "missing_credentials";
  }
  return null;
}

export function pinFromCreateResponse(tenantId: string | undefined, slug: string | undefined): LifecyclePin {
  if (!tenantId || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(tenantId)) {
    throw new Error("REFUSE: create response did not include a tenant id");
  }
  if (!slug || isProtectedSlug(slug) || !hasLifecyclePrefix(slug)) {
    throw new Error("REFUSE: create response slug is not a disposable lifecycle tenant");
  }
  return Object.freeze({ tenantId, slug: normalizeSlug(slug) });
}

export function assertMutationTarget(
  pin: LifecyclePin | null,
  tenantId: string,
  slug: string,
): LifecycleGateReason | null {
  if (!pin) {
    return "unpinned_tenant";
  }
  if (isProtectedSlug(slug) || isProtectedSlug(pin.slug)) {
    return "protected_slug";
  }
  if (!hasLifecyclePrefix(slug) || !hasLifecyclePrefix(pin.slug)) {
    return "missing_lifecycle_prefix";
  }
  if (tenantId !== pin.tenantId || normalizeSlug(slug) !== pin.slug) {
    return "unpinned_tenant";
  }
  return null;
}

export function refuseExternalTenantId(env: NodeJS.Dict<string>): LifecycleGateReason | null {
  const injected =
    env.UAT_LIFECYCLE_TENANT_ID ||
    env.LIFECYCLE_TENANT_ID ||
    env.UAT_AUTO_LIFECYCLE_TENANT_ID;
  return injected ? "external_tenant_id" : null;
}

export function tenantOrigin(publicBaseUrl: string, slug: string): string {
  if (!isUatPublicBase(publicBaseUrl) || isProtectedSlug(slug) || !hasLifecyclePrefix(slug)) {
    throw new Error("REFUSE: cannot derive a lifecycle tenant origin");
  }
  return `https://${normalizeSlug(slug)}.uat.cohestra.app`;
}

export function isAllowedLifecycleUrl(url: string, pin: LifecyclePin | null, method = "GET"): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const verb = method.toUpperCase();
  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname;
  const apex = host === "uat.cohestra.app";
  const tenantHost = pin ? `${pin.slug}.uat.cohestra.app` : null;

  if (/paddle|checkout|subscription|billing|complimentary|invoice|portal/i.test(url)) {
    return false;
  }

  if (apex && verb === "POST" && path === "/api/v1/auth/login") {
    return true;
  }
  if (apex && verb === "GET" && path === "/api/v1/platform/me") {
    return true;
  }
  if (apex && verb === "POST" && path === "/api/v1/platform/tenants" && !parsed.search) {
    return true;
  }
  if (
    apex &&
    verb === "POST" &&
    pin &&
    new RegExp(`^/api/v1/platform/tenants/${pin.tenantId}/(suspend|reactivate|archive)$`).test(path)
  ) {
    return true;
  }
  if (
    apex &&
    verb === "GET" &&
    path === "/api/v1/platform/audits" &&
    pin &&
    parsed.searchParams.get("tenantId") === pin.tenantId
  ) {
    return true;
  }
  if (tenantHost && verb === "GET" && host === tenantHost && path === "/api/v1/public/door") {
    return true;
  }
  if (tenantHost && verb === "GET" && host === tenantHost && path === "/") {
    return true;
  }
  return false;
}

export function exclusivePlatformAdminRoles(roles: string[] | undefined): boolean {
  if (!roles || roles.length === 0) {
    return false;
  }
  const forbidden = new Set<string>(TENANT_ROLES);
  if (roles.some((role) => forbidden.has(role))) {
    return false;
  }
  return roles.includes("PlatformAdmin");
}

export function buildDisposableSlug(targetSha: string, runId: string | undefined): string {
  const shaPart = targetSha.slice(0, 8).toLowerCase();
  const runPart = (runId ?? Date.now().toString(36)).replace(/[^a-z0-9]/gi, "").slice(-8).toLowerCase();
  const slug = `${LIFECYCLE_SLUG_PREFIX}${shaPart}-${runPart}`;
  if (slug.length > 48 || isProtectedSlug(slug) || !hasLifecyclePrefix(slug)) {
    throw new Error("REFUSE: generated lifecycle slug is invalid");
  }
  return slug;
}
