import { describe, expect, it } from "vitest";
import {
  assertMutationTarget,
  buildDisposableSlug,
  evaluateEnvironmentGate,
  exclusivePlatformAdminRoles,
  hasLifecyclePrefix,
  isAllowedLifecycleUrl,
  isProtectedSlug,
  pinFromCreateResponse,
  refuseExternalTenantId,
  tenantOrigin,
} from "./guards";

const SHA = "830adc140d3aa45edd9df70af8664789b25c2296";
const GATE = {
  lifecycleEnabled: "true",
  lifecycleOpen: true,
  publicBaseUrl: "https://uat.cohestra.app",
  targetSha: SHA,
  email: "uat-lifecycle-admin@example.invalid",
  password: "not-a-real-secret",
  githubEnvironment: "uat",
};

describe("19.5 lifecycle environment gate", () => {
  it("allows the authorized UAT opt-in", () => {
    expect(evaluateEnvironmentGate(GATE)).toBeNull();
  });

  it("refuses when UAT_AUTO_LIFECYCLE_ENABLED is not exact true", () => {
    expect(evaluateEnvironmentGate({ ...GATE, lifecycleEnabled: "TRUE" })).toBe("lifecycle_disabled");
    expect(evaluateEnvironmentGate({ ...GATE, lifecycleEnabled: "1" })).toBe("lifecycle_disabled");
    expect(evaluateEnvironmentGate({ ...GATE, lifecycleEnabled: undefined })).toBe("lifecycle_disabled");
  });

  it("refuses when Story 19.5 lifecycle is closed", () => {
    expect(evaluateEnvironmentGate({ ...GATE, lifecycleOpen: false })).toBe("story_closed");
  });

  it("refuses production hostnames", () => {
    expect(evaluateEnvironmentGate({ ...GATE, publicBaseUrl: "https://cohestra.app" })).toBe("production_host");
    expect(evaluateEnvironmentGate({ ...GATE, publicBaseUrl: "https://www.cohestra.app" })).toBe("production_host");
    expect(evaluateEnvironmentGate({ ...GATE, publicBaseUrl: "https://picklemania.cohestra.app" })).toBe(
      "production_host",
    );
    expect(evaluateEnvironmentGate({ ...GATE, githubEnvironment: "production" })).toBe("production_host");
  });

  it("refuses missing or unpinned SHAs", () => {
    expect(evaluateEnvironmentGate({ ...GATE, targetSha: undefined })).toBe("missing_target_sha");
    expect(evaluateEnvironmentGate({ ...GATE, targetSha: "main" })).toBe("unpinned_target_sha");
  });

  it("refuses missing credentials without echoing them", () => {
    expect(evaluateEnvironmentGate({ ...GATE, email: "" })).toBe("missing_credentials");
    expect(evaluateEnvironmentGate({ ...GATE, password: "" })).toBe("missing_credentials");
  });
});

describe("19.5 lifecycle mutation guards", () => {
  it("refuses default, picklemania, and creativorare", () => {
    for (const slug of ["default", "picklemania", "creativorare", "Default", "PICKLEMANIA"]) {
      expect(isProtectedSlug(slug)).toBe(true);
      expect(hasLifecyclePrefix(slug)).toBe(false);
    }
  });

  it("pins only the create response and refuses arbitrary ids", () => {
    const pin = pinFromCreateResponse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", "uat-19-5-lifecycle-830adc14-25819");
    expect(
      assertMutationTarget(pin, pin.tenantId, pin.slug),
    ).toBeNull();
    expect(
      assertMutationTarget(pin, "11111111-1111-1111-1111-111111111111", pin.slug),
    ).toBe("unpinned_tenant");
    expect(assertMutationTarget(null, pin.tenantId, pin.slug)).toBe("unpinned_tenant");
    expect(assertMutationTarget(pin, pin.tenantId, "picklemania")).toBe("protected_slug");
    expect(assertMutationTarget(pin, pin.tenantId, "other-tenant")).toBe("missing_lifecycle_prefix");
    expect(refuseExternalTenantId({ UAT_LIFECYCLE_TENANT_ID: pin.tenantId })).toBe("external_tenant_id");
    expect(refuseExternalTenantId({})).toBeNull();
  });

  it("refuses to pin protected or prefix-less create slugs", () => {
    expect(() => pinFromCreateResponse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", "picklemania")).toThrow(/REFUSE/);
    expect(() => pinFromCreateResponse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", "default")).toThrow(/REFUSE/);
    expect(() => pinFromCreateResponse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", "creativorare")).toThrow(/REFUSE/);
    expect(() => pinFromCreateResponse("not-a-guid", "uat-19-5-lifecycle-x")).toThrow(/REFUSE/);
  });

  it("allowlists only Story 19.5 lifecycle URLs", () => {
    const pin = pinFromCreateResponse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", "uat-19-5-lifecycle-830adc14-25819");
    expect(isAllowedLifecycleUrl("https://uat.cohestra.app/api/v1/auth/login", pin, "POST")).toBe(true);
    expect(isAllowedLifecycleUrl("https://uat.cohestra.app/api/v1/auth/login", pin, "GET")).toBe(false);
    expect(isAllowedLifecycleUrl("https://uat.cohestra.app/api/v1/platform/me", pin, "GET")).toBe(true);
    expect(isAllowedLifecycleUrl("https://uat.cohestra.app/api/v1/platform/tenants", pin, "POST")).toBe(true);
    expect(isAllowedLifecycleUrl("https://uat.cohestra.app/api/v1/platform/tenants", pin, "GET")).toBe(false);
    expect(
      isAllowedLifecycleUrl(`https://uat.cohestra.app/api/v1/platform/tenants/${pin.tenantId}/suspend`, pin, "POST"),
    ).toBe(true);
    expect(
      isAllowedLifecycleUrl(
        `https://uat.cohestra.app/api/v1/platform/audits?tenantId=${pin.tenantId}&action=TenantCreated`,
        pin,
        "GET",
      ),
    ).toBe(true);
    expect(isAllowedLifecycleUrl(`${tenantOrigin("https://uat.cohestra.app", pin.slug)}/`, pin, "GET")).toBe(true);
    expect(
      isAllowedLifecycleUrl("https://uat.cohestra.app/api/v1/platform/tenants/11111111-1111-1111-1111-111111111111/suspend", pin),
    ).toBe(false);
    expect(isAllowedLifecycleUrl("https://uat.cohestra.app/api/v1/platform/tenants?page=1", pin)).toBe(false);
    expect(isAllowedLifecycleUrl("https://cohestra.app/api/v1/platform/tenants", pin)).toBe(false);
    expect(isAllowedLifecycleUrl("https://api.paddle.com/subscriptions", pin)).toBe(false);
    expect(
      isAllowedLifecycleUrl(`https://uat.cohestra.app/api/v1/platform/tenants/${pin.tenantId}/complimentary`, pin),
    ).toBe(false);
    expect(isAllowedLifecycleUrl("https://picklemania.uat.cohestra.app/", pin)).toBe(false);
  });

  it("requires exclusive PlatformAdmin roles", () => {
    expect(exclusivePlatformAdminRoles(["PlatformAdmin"])).toBe(true);
    expect(exclusivePlatformAdminRoles(["PlatformAdmin", "TenantAdmin"])).toBe(false);
    expect(exclusivePlatformAdminRoles(["PlatformAdmin", "TenantMember"])).toBe(false);
    expect(exclusivePlatformAdminRoles(["TenantAdmin"])).toBe(false);
    expect(exclusivePlatformAdminRoles([])).toBe(false);
  });

  it("builds a disposable slug that cannot collide with protected tenants", () => {
    const slug = buildDisposableSlug(SHA, "39004625819");
    expect(slug.startsWith("uat-19-5-lifecycle-")).toBe(true);
    expect(isProtectedSlug(slug)).toBe(false);
    expect(slug.length).toBeLessThanOrEqual(48);
  });
});
