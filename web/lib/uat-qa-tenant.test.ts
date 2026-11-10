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
    role: "basic",
    base,
    configuredSlug: UAT_QA_TENANTS.basic.slug,
    sessionOrigin: "https://cohestra-qa-basic.uat.cohestra.app",
    doorKind: "active",
    shell: {
      tenantSlug: UAT_QA_TENANTS.basic.slug,
      tenantName: UAT_QA_TENANTS.basic.name,
      plan: "Basic",
      seats: 1,
    },
    ...overrides,
  };
}

describe("UAT QA tenant hostnames", () => {
  it("builds the Basic tenant host from the marketing apex", () => {
    expect(resolveUatWorkspaceOrigin(base, UAT_QA_TENANTS.basic.slug)).toBe(
      "https://cohestra-qa-basic.uat.cohestra.app",
    );
  });
});

describe("requireConfiguredQaSlug", () => {
  it("requires the dedicated Basic slug", () => {
    expect(requireConfiguredQaSlug("basic", "cohestra-qa-basic")).toBe("cohestra-qa-basic");
    expect(requireConfiguredQaSlug("basic", " cohestra-qa-basic ")).toBe("cohestra-qa-basic");
  });

  it("rejects a missing slug instead of choosing another tenant", () => {
    expect(() => requireConfiguredQaSlug("basic", undefined)).toThrow(/REQUIRED OWNER ACTION/);
    expect(() => requireConfiguredQaSlug("basic", "  ")).toThrow(/UAT_AUTO_BASIC_SLUG/);
  });

  it("rejects the marketing apex and any other workspace slug", () => {
    expect(() => requireConfiguredQaSlug("basic", "uat")).toThrow(/cohestra-qa-basic/);
    expect(() => requireConfiguredQaSlug("basic", "default")).toThrow(/cohestra-qa-basic/);
    expect(() => requireConfiguredQaSlug("basic", "creativorare")).toThrow(/REQUIRED OWNER ACTION/);
  });
});

describe("assertQaSession", () => {
  it("accepts the matching Basic hostname, door, and plan", () => {
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
            plan: "Basic",
            seats: 1,
          },
        }),
      ),
    ).toThrow(/different tenant|authenticated tenant/i);
  });

  it("rejects the wrong plan and the wrong seat limit", () => {
    expect(() =>
      assertQaSession(session({ shell: { ...session().shell, plan: "Pro" } })),
    ).toThrow(/plan/i);
    expect(() =>
      assertQaSession(session({ shell: { ...session().shell, seats: 10 } })),
    ).toThrow(/seat/i);
  });

  it("rejects a suspended, archived, or missing workspace", () => {
    expect(() => assertQaSession(session({ doorKind: "suspended" }))).toThrow(/suspended/i);
    expect(() => assertQaSession(session({ doorKind: "archived" }))).toThrow(/archived/i);
    expect(() => assertQaSession(session({ doorKind: "unknown" }))).toThrow(/unknown|unavailable/i);
  });
});
