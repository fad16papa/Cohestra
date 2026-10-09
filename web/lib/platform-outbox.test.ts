import { describe, expect, it } from "vitest";

import {
  getPlatformOpsOutboxList,
  getPlatformOpsOutboxSummary,
  parsePlatformOpsOutboxList,
} from "@/lib/platform-api";
import {
  failedCount,
  NO_FAILED_OUTBOX_CAVEAT,
  NO_FAILED_OUTBOX_COPY,
  OUTBOX_MUTATION_LABELS,
} from "@/lib/platform-outbox";

const observedAt = "2026-10-09T12:00:00Z";

function kpi(value: unknown) {
  return {
    value,
    source: "PostgreSQL outbox_messages",
    observedAt,
    freshness: "actual",
  };
}

describe("Story 44.4 outbox parsers", () => {
  it("maps summary provenance and failed counts", async () => {
    const summary = await getPlatformOpsOutboxSummary(
      async () =>
        new Response(
          JSON.stringify({
            countsByStatus: kpi([
              { key: "Pending", count: 1 },
              { key: "Processing", count: 0 },
              { key: "Completed", count: 2 },
              { key: "Failed", count: 3 },
            ]),
            countsByMessageType: kpi([{ key: "campaign.recipient", count: 3 }]),
          }),
          { status: 200 }
        )
    );
    expect(summary.countsByStatus.freshness).toBe("actual");
    expect(summary.countsByStatus.source).toBe("PostgreSQL outbox_messages");
    expect(failedCount(summary.countsByStatus.value)).toBe(3);
  });

  it("allow-lists list items and rejects overlong lastErrorSanitized", async () => {
    const listed = await getPlatformOpsOutboxList(async (input) => {
      expect(String(input)).toContain("pageSize=25");
      expect(String(input)).not.toContain("pageSize=1000");
      return new Response(
        JSON.stringify({
          items: [
            {
              id: "11111111-1111-1111-1111-111111111111",
              tenantId: "22222222-2222-2222-2222-222222222222",
              messageType: "campaign.recipient",
              status: "Failed",
              attemptCount: 5,
              createdAt: observedAt,
              nextAttemptAt: observedAt,
              processedAt: null,
              claimedAt: null,
              dispatchedAt: null,
              lastErrorSanitized: "[redacted] smtp timeout",
              payloadJson: "CUSTOMER_BODY_SENTINEL_44_4",
              lastError: "Password=secret",
            },
          ],
          page: 1,
          pageSize: 25,
          totalCount: 1,
        }),
        { status: 200 }
      );
    });
    expect(listed.items[0]).toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      tenantId: "22222222-2222-2222-2222-222222222222",
      messageType: "campaign.recipient",
      status: "Failed",
      attemptCount: 5,
      createdAt: observedAt,
      nextAttemptAt: observedAt,
      processedAt: null,
      claimedAt: null,
      dispatchedAt: null,
      lastErrorSanitized: "[redacted] smtp timeout",
    });
    expect(listed.items[0]).not.toHaveProperty("payloadJson");
    expect(listed.items[0]).not.toHaveProperty("lastError");

    expect(() =>
      parsePlatformOpsOutboxList({
        items: [
          {
            id: "11111111-1111-1111-1111-111111111111",
            tenantId: "22222222-2222-2222-2222-222222222222",
            messageType: "campaign.recipient",
            status: "Failed",
            attemptCount: 1,
            createdAt: observedAt,
            nextAttemptAt: observedAt,
            lastErrorSanitized: "x".repeat(201),
          },
        ],
        page: 1,
        pageSize: 25,
        totalCount: 1,
      })
    ).toThrow(/lastErrorSanitized/);
  });

  it("keeps empty-failed copy truthful and lists no mutation verbs", () => {
    expect(NO_FAILED_OUTBOX_COPY).toBe("No failed outbox jobs are recorded.");
    expect(NO_FAILED_OUTBOX_COPY).not.toMatch(/healthy|uptime|email is/i);
    expect(NO_FAILED_OUTBOX_CAVEAT).toMatch(/does not mean email is healthy/i);
    expect(OUTBOX_MUTATION_LABELS).toContain("Requeue");
  });
});
