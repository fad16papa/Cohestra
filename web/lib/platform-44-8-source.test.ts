import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  listPlatformSupportIssues,
  PLATFORM_AUDIT_ACTIONS,
  PLATFORM_SUPPORT_SEVERITIES,
} from "@/lib/platform-api";

const INBOX = readFileSync(
  resolve(import.meta.dirname, "../app/(platform)/platform/support/page.tsx"),
  "utf8"
);
const DETAIL = readFileSync(
  resolve(import.meta.dirname, "../app/(platform)/platform/support/[id]/page.tsx"),
  "utf8"
);
const TENANT_API = readFileSync(resolve(import.meta.dirname, "./support-api.ts"), "utf8");

describe("Story 44.8 support severity source contract", () => {
  it("locks the severity vocabulary and 44.7 action integration", () => {
    expect([...PLATFORM_SUPPORT_SEVERITIES]).toEqual([
      "Unspecified",
      "Low",
      "Medium",
      "High",
      "Critical",
    ]);
    expect(PLATFORM_AUDIT_ACTIONS).toContain("SupportIssueSeverityChanged");
    expect(INBOX).toContain("All severities");
    expect(INBOX).toContain("Filter by severity");
    expect(DETAIL).toContain("htmlFor=\"support-severity\"");
    expect(DETAIL).toContain("Severity");
    expect(DETAIL).toContain("Save changes");
    expect(TENANT_API).not.toContain("severity");
    expect(INBOX + DETAIL).not.toMatch(/Incident|on-call|P0/);
  });

  it("parses list severity and rejects unknown values", async () => {
    const ok = await listPlatformSupportIssues(async () =>
      new Response(
        JSON.stringify({
          items: [
            {
              id: "11111111-1111-1111-1111-111111111111",
              issueNumber: "SUP20261010000001",
              tenantSlug: "demo",
              operatorEmail: "ops@example.com",
              subject: "Help",
              status: "Open",
              severity: "Unspecified",
              createdAt: "2026-10-10T00:00:00Z",
            },
          ],
          page: 1,
          pageSize: 25,
          totalCount: 1,
        }),
        { status: 200 }
      )
    );
    expect(ok.items[0]?.severity).toBe("Unspecified");

    await expect(
      listPlatformSupportIssues(async () =>
        new Response(
          JSON.stringify({
            items: [
              {
                id: "11111111-1111-1111-1111-111111111111",
                issueNumber: "SUP20261010000001",
                tenantSlug: "demo",
                operatorEmail: "ops@example.com",
                subject: "Help",
                status: "Open",
                severity: "Emergency",
                createdAt: "2026-10-10T00:00:00Z",
              },
            ],
            page: 1,
            pageSize: 25,
            totalCount: 1,
          }),
          { status: 200 }
        )
      )
    ).rejects.toThrow(/severity/i);
  });
});
