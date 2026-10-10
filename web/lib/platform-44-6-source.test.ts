import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { getPlatformTenantTimeline } from "@/lib/platform-api";

const TENANT = readFileSync(
  resolve(import.meta.dirname, "../app/(platform)/platform/tenants/[id]/page.tsx"),
  "utf8"
);
const TIMELINE = readFileSync(
  resolve(import.meta.dirname, "../components/platform/platform-tenant-timeline.tsx"),
  "utf8"
);
const OPS = readFileSync(
  resolve(import.meta.dirname, "../components/platform/platform-tenant-ops-panel.tsx"),
  "utf8"
);
const HEADER = readFileSync(
  resolve(import.meta.dirname, "../components/platform/platform-header.tsx"),
  "utf8"
);

describe("Story 44.6 tenant timeline source contract", () => {
  it("adds Timeline without replacing snapshot, recovery, lifecycle, or recent audit", () => {
    expect(TENANT).toContain("PlatformTenantTimeline");
    expect(TENANT).toContain("PlatformTenantOpsPanel");
    expect(TENANT).toContain("Lifecycle");
    expect(TENANT).toContain("Complimentary");
    expect(TENANT).toContain("Recent audit");
    expect(OPS).toContain("Members & recovery");
    expect(OPS).toContain("Send password reset");
    expect(TENANT).not.toContain("/platform/audits");
    expect(TENANT + TIMELINE).not.toMatch(/impersonat/i);
    expect(TIMELINE).not.toContain("Replay");
    expect(TIMELINE).not.toContain("Requeue");
    expect(TIMELINE).not.toContain("Mark Paid");
  });

  it("keeps loading, empty, error, and missing-instrumentation copy honest", () => {
    expect(TIMELINE).toContain("Loading diagnostic timeline");
    expect(TIMELINE).toContain("No diagnostic timeline events are recorded for this tenant yet.");
    expect(TIMELINE).toContain("Diagnostic timeline unavailable.");
    expect(TIMELINE).toContain("missing instrumentation");
    expect(TIMELINE).not.toContain("Everything is healthy");
    expect(TIMELINE).not.toContain("Paddle is down");
    expect(TIMELINE).toContain('role="status"');
    expect(TIMELINE).toContain('role="alert"');
    expect(TIMELINE).toContain("<ol");
    expect(TIMELINE).toContain("<time");
    expect(TIMELINE).toContain("Source:");
    expect(TIMELINE).toContain("tenant-timeline-heading");
  });

  it("parses allow-listed timeline items and rejects unknown types", async () => {
    const payload = {
      tenantId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      observedAt: "2026-10-10T01:00:00Z",
      hasHistoricalEvents: true,
      items: [
        {
          id: "audit:1",
          type: "audit",
          timestamp: "2026-10-09T12:00:00Z",
          provenance: "platform_audit_logs",
          summary: "Platform audit TenantCreated",
          metadata: { action: "TenantCreated" },
        },
      ],
      sources: [
        { source: "paddle_webhook_deliveries", state: "missing_instrumentation", itemCount: 0 },
      ],
    };
    const tenantId = payload.tenantId;
    const ok = await getPlatformTenantTimeline(
      async () => new Response(JSON.stringify(payload), { status: 200 }),
      tenantId
    );
    expect(ok.items[0]?.type).toBe("audit");
    expect(ok.sources[0]?.state).toBe("missing_instrumentation");

    await expect(
      getPlatformTenantTimeline(
        async () =>
          new Response(
            JSON.stringify({
              ...payload,
              items: [{ ...payload.items[0], type: "secret_dump" }],
            }),
            { status: 200 }
          ),
        tenantId
      )
    ).rejects.toThrow(/timeline type/i);
  });
});
