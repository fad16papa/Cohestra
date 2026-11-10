import {
  configuredSlugIsMarketingApex,
  resolveUatWorkspaceOrigin,
} from "./uat-workspace-origin";

export type QaRole = "basic";

export const UAT_QA_TENANTS = {
  basic: {
    envName: "UAT_AUTO_BASIC_SLUG",
    slug: "cohestra-qa-basic",
    name: "Cohestra QA Basic",
    plan: "Basic",
    seats: 1,
  },
} as const;

export type QaShellEvidence = {
  tenantSlug: string;
  tenantName: string;
  plan: string;
  seats: number | null;
};

export type QaSessionCheck = {
  role: QaRole;
  base: string;
  configuredSlug: string;
  sessionOrigin: string;
  doorKind: string;
  shell: QaShellEvidence;
};

export function requireConfiguredQaSlug(role: QaRole, raw: string | undefined): string {
  const expected = UAT_QA_TENANTS[role];
  const slug = raw?.trim().toLowerCase() ?? "";
  if (!slug) {
    throw new Error(
      `REQUIRED OWNER ACTION: ${expected.envName} is missing. Set it to ${expected.slug} after ${expected.name} is verified. Acceptance does not fall back to another tenant.`,
    );
  }

  if (slug !== expected.slug || configuredSlugIsMarketingApex("https://uat.cohestra.app", slug)) {
    throw new Error(
      `REQUIRED OWNER ACTION: ${expected.envName} must be ${expected.slug}. Acceptance will not use the marketing apex or a different workspace.`,
    );
  }

  return slug;
}

export function assertQaSession(input: QaSessionCheck): void {
  const expected = UAT_QA_TENANTS[input.role];
  if (input.configuredSlug !== expected.slug) {
    throw new Error(
      `REQUIRED OWNER ACTION: ${expected.envName} must be ${expected.slug}.`,
    );
  }

  const expectedOrigin = resolveUatWorkspaceOrigin(input.base, expected.slug);
  let sessionOrigin: string;
  try {
    sessionOrigin = new URL(input.sessionOrigin).origin;
  } catch {
    sessionOrigin = "";
  }

  if (sessionOrigin !== expectedOrigin || configuredSlugIsMarketingApex(input.base, input.configuredSlug)) {
    throw new Error(
      `REQUIRED OWNER ACTION: session host does not match ${expected.slug}. Refusing a handoff onto a different tenant.`,
    );
  }

  const doorKind = input.doorKind.trim().toLowerCase();
  if (doorKind === "suspended" || doorKind === "archived") {
    throw new Error(
      `REQUIRED OWNER ACTION: ${expected.slug} is ${doorKind}. Acceptance requires an active workspace.`,
    );
  }

  if (doorKind !== "active") {
    throw new Error(
      `REQUIRED OWNER ACTION: ${expected.slug} public door is ${doorKind || "unavailable"}.`,
    );
  }

  const shellSlug = input.shell.tenantSlug.trim().toLowerCase();
  if (shellSlug !== expected.slug) {
    throw new Error(
      `REQUIRED OWNER ACTION: authenticated tenant does not match ${expected.slug}.`,
    );
  }

  if (input.shell.tenantName.trim() !== expected.name) {
    throw new Error(
      `REQUIRED OWNER ACTION: workspace name must be ${expected.name}.`,
    );
  }

  if (input.shell.plan.trim() !== expected.plan) {
    throw new Error(
      `REQUIRED OWNER ACTION: ${expected.slug} plan is ${input.shell.plan.trim() || "missing"}, expected ${expected.plan}.`,
    );
  }

  if (input.shell.seats !== expected.seats) {
    throw new Error(
      `REQUIRED OWNER ACTION: ${expected.slug} seat limit is ${input.shell.seats ?? "missing"}, expected ${expected.seats}.`,
    );
  }
}
