import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { listPlatformAudits } from "@/lib/platform-api";

const HEADER = readFileSync(
  resolve(import.meta.dirname, "../components/platform/platform-header.tsx"),
  "utf8"
);
const PAGE = readFileSync(
  resolve(import.meta.dirname, "../app/(platform)/platform/audits/page.tsx"),
  "utf8"
);
const TENANT = readFileSync(
  resolve(import.meta.dirname, "../app/(platform)/platform/tenants/[id]/page.tsx"),
  "utf8"
);

describe("Story 44.7 platform audits source contract", () => {
  it("adds Audits nav without replacing directory or tenant investigation", () => {
    expect(HEADER).toContain('href: "/platform/audits"');
    expect(HEADER).toContain('label: "Audits"');
    expect(HEADER).toContain('href === "/platform/audits"');
    expect(PAGE).toContain("<h1");
    expect(PAGE).toContain("Audits");
    expect(PAGE).toContain("Apply filters");
    expect(PAGE).toContain("Clear");
    expect(PAGE).toContain("Export CSV");
    expect(PAGE).toContain("Loading platform audits");
    expect(PAGE).toContain("No platform audit entries are recorded.");
    expect(PAGE).toContain("No audit entries match these filters.");
    expect(PAGE).toContain("Audits are unavailable");
    expect(PAGE).toContain("Unknown actor email");
    expect(PAGE).not.toContain("detailsJson");
    expect(PAGE).not.toContain("No activity occurred");
    expect(TENANT).toContain("Recent audit");
    expect(TENANT).toContain("PlatformTenantTimeline");
  });

  it("parses allow-listed audits and rejects DetailsJson", async () => {
    const ok = await listPlatformAudits(async () =>
      new Response(
        JSON.stringify({
          items: [
            {
              id: "11111111-1111-1111-1111-111111111111",
              actorUserId: "22222222-2222-2222-2222-222222222222",
              actorEmail: null,
              tenantId: "33333333-3333-3333-3333-333333333333",
              action: "TenantSuspended",
              reason: "ToS",
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
    expect(ok.items[0]?.actorEmail).toBeNull();
    expect(ok.totalCount).toBe(1);

    await expect(
      listPlatformAudits(async () =>
        new Response(
          JSON.stringify({
            items: [
              {
                id: "11111111-1111-1111-1111-111111111111",
                actorUserId: "22222222-2222-2222-2222-222222222222",
                actorEmail: "ops@example.com",
                tenantId: "33333333-3333-3333-3333-333333333333",
                action: "TenantSuspended",
                reason: "ToS",
                createdAt: "2026-10-10T00:00:00Z",
                detailsJson: "AUDIT_DETAILS_SECRET_44_7",
              },
            ],
            page: 1,
            pageSize: 25,
            totalCount: 1,
          }),
          { status: 200 }
        )
      )
    ).rejects.toThrow(/DetailsJson/i);
  });
});
