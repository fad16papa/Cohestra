import { describe, expect, it } from "vitest";

import { resolveUatWorkspaceOrigin } from "@/lib/uat-workspace-origin";
import {
  UAT_QA_TENANTS,
  assertQaSession,
  requireConfiguredQaSlug,
  type QaSessionCheck,
} from "@/lib/uat-qa-tenant";

const base = "https://uat.cohestra.app";

function session(overrides: Partial<QaSessionCheck> = {}): QaSessionCheck {
  return {
    role: "pro",
    base,
    configuredSlug: UAT_QA_TENANTS.pro.slug,
    sessionOrigin: "https://cohestra-qa-pro.uat.cohestra.app",
    doorKind: "active",
    shell: {
      tenantSlug: UAT_QA_TENANTS.pro.slug,
      tenantName: UAT_QA_TENANTS.pro.name,
      plan: "Pro",
      seats: 10,
    },
    ...overrides,
  };
}

describe("UAT QA tenant hostnames", () => {
  it("builds the Basic and Pro tenant hosts from the marketing apex", () => {
    expect(resolveUatWorkspaceOrigin(base, UAT_QA_TENANTS.basic.slug)).toBe(
      "https://cohestra-qa-basic.uat.cohestra.app",
    );
    expect(resolveUatWorkspaceOrigin(base, UAT_QA_TENANTS.pro.slug)).toBe(
      "https://cohestra-qa-pro.uat.cohestra.app",
    );
  });
});

describe("requireConfiguredQaSlug", () => {
  it("requires the dedicated Basic and Pro slugs", () => {
    expect(requireConfiguredQaSlug("basic", "cohestra-qa-basic")).toBe("cohestra-qa-basic");
    expect(requireConfiguredQaSlug("pro", " cohestra-qa-pro ")).toBe("cohestra-qa-pro");
  });

  it("rejects a missing slug instead of choosing another tenant", () => {
    expect(() => requireConfiguredQaSlug("basic", undefined)).toThrow(/REQUIRED OWNER ACTION/);
    expect(() => requireConfiguredQaSlug("basic", "  ")).toThrow(/UAT_AUTO_BASIC_SLUG/);
    expect(() => requireConfiguredQaSlug("pro", undefined)).toThrow(/UAT_AUTO_PRO_SLUG/);
  });

  it("rejects the marketing apex and any other workspace slug", () => {
    expect(() => requireConfiguredQaSlug("pro", "uat")).toThrow(/cohestra-qa-pro/);
    expect(() => requireConfiguredQaSlug("basic", "default")).toThrow(/cohestra-qa-basic/);
    expect(() => requireConfiguredQaSlug("pro", "creativorare")).toThrow(/REQUIRED OWNER ACTION/);
  });
});

describe("assertQaSession", () => {
  it("accepts the matching Basic hostname, door, and plan", () => {
    expect(() =>
      assertQaSession(
        session({
          role: "basic",
          configuredSlug: UAT_QA_TENANTS.basic.slug,
          sessionOrigin: "https://cohestra-qa-basic.uat.cohestra.app",
          shell: {
            tenantSlug: "cohestra-qa-basic",
            tenantName: "Cohestra QA Basic",
            plan: "Basic",
            seats: 1,
          },
        }),
      ),
    ).not.toThrow();
  });

  it("accepts the matching Pro hostname and Pro entitlement", () => {
    expect(() => assertQaSession(session())).not.toThrow();
  });

  it("rejects a session that stayed on the marketing apex", () => {
    expect(() => assertQaSession(session({ sessionOrigin: "https://uat.cohestra.app" }))).toThrow(
      /handoff|host/i,
    );
  });

  it("rejects a handoff onto a different tenant", () => {
    expect(() =>
      assertQaSession(
        session({
          sessionOrigin: "https://other-tenant.uat.cohestra.app",
          shell: {
            tenantSlug: "other-tenant",
            tenantName: "Other",
            plan: "Pro",
            seats: 10,
          },
        }),
      ),
    ).toThrow(/different tenant|authenticated tenant/i);
  });

  it("rejects the other QA tenant on a Pro session", () => {
    expect(() =>
      assertQaSession(
        session({
          sessionOrigin: "https://cohestra-qa-basic.uat.cohestra.app",
          shell: {
            tenantSlug: "cohestra-qa-basic",
            tenantName: "Cohestra QA Basic",
            plan: "Basic",
            seats: 1,
          },
        }),
      ),
    ).toThrow(/authenticated tenant|host/i);
  });

  it("rejects the wrong plan and the wrong seat limit", () => {
    expect(() =>
      assertQaSession(session({ shell: { ...session().shell, plan: "Core" } })),
    ).toThrow(/plan/i);
    expect(() =>
      assertQaSession(
        session({
          role: "basic",
          configuredSlug: "cohestra-qa-basic",
          sessionOrigin: "https://cohestra-qa-basic.uat.cohestra.app",
          shell: {
            tenantSlug: "cohestra-qa-basic",
            tenantName: "Cohestra QA Basic",
            plan: "Pro",
            seats: 10,
          },
        }),
      ),
    ).toThrow(/plan/i);
    expect(() =>
      assertQaSession(
        session({
          role: "basic",
          configuredSlug: "cohestra-qa-basic",
          sessionOrigin: "https://cohestra-qa-basic.uat.cohestra.app",
          shell: {
            tenantSlug: "cohestra-qa-basic",
            tenantName: "Cohestra QA Basic",
            plan: "Basic",
            seats: 3,
          },
        }),
      ),
    ).toThrow(/seat/i);
  });

  it("rejects a suspended, archived, or missing workspace", () => {
    expect(() => assertQaSession(session({ doorKind: "suspended" }))).toThrow(/suspended/i);
    expect(() => assertQaSession(session({ doorKind: "archived" }))).toThrow(/archived/i);
    expect(() => assertQaSession(session({ doorKind: "unknown" }))).toThrow(/unknown|unavailable/i);
  });
});
