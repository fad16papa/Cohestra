import type { Page } from "@playwright/test";

import {
  assertQaSession,
  type QaRole,
  type QaShellEvidence,
} from "../lib/uat-qa-tenant";

/**
 * Confirm the settled browser session is the configured QA workspace.
 * Errors name the slug, plan, and door kind only.
 */
export async function assertLiveQaSession(
  page: Page,
  input: {
    role: QaRole;
    base: string;
    configuredSlug: string;
    sessionOrigin: string;
  },
): Promise<void> {
  const door = await page.request.get(`${input.sessionOrigin}/api/v1/public/door`);
  if (!door.ok()) {
    throw new Error(`REQUIRED OWNER ACTION: public door returned ${door.status()}.`);
  }

  const doorBody = (await door.json()) as { kind?: string; Kind?: string };
  const token = await page.evaluate(() => {
    const raw = window.localStorage.getItem("auth_session");
    if (!raw) {
      return "";
    }
    try {
      const parsed = JSON.parse(raw) as { accessToken?: string };
      return typeof parsed.accessToken === "string" ? parsed.accessToken : "";
    } catch {
      return "";
    }
  });
  if (!token) {
    throw new Error("REQUIRED OWNER ACTION: signed-in session has no access token.");
  }

  const shellResponse = await page.request.get(`${input.sessionOrigin}/api/v1/admin/shell`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!shellResponse.ok()) {
    throw new Error(`REQUIRED OWNER ACTION: admin/shell returned ${shellResponse.status()}.`);
  }

  const shell = (await shellResponse.json()) as Record<string, unknown>;
  const limits = (shell.limits ?? shell.Limits) as
    | { seats?: number; Seats?: number }
    | undefined;
  const seatsValue = limits?.seats ?? limits?.Seats;
  const evidence: QaShellEvidence = {
    tenantSlug: String(shell.tenantSlug ?? shell.TenantSlug ?? ""),
    tenantName: String(shell.tenantName ?? shell.TenantName ?? ""),
    plan: String(shell.plan ?? shell.Plan ?? ""),
    seats: typeof seatsValue === "number" ? seatsValue : null,
  };

  assertQaSession({
    ...input,
    doorKind: String(doorBody.kind ?? doorBody.Kind ?? ""),
    shell: evidence,
  });
}
