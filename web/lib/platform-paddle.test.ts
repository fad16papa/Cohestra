import { describe, expect, it } from "vitest";

import {
  getPlatformOpsPaddleConfig,
  getPlatformOpsPaddleDeliveries,
  parsePlatformOpsPaddleConfig,
  parsePlatformOpsPaddleDeliveryList,
} from "@/lib/platform-api";
import {
  environmentLabel,
  FILTERED_EMPTY_COPY,
  MISSING_INSTRUMENTATION_CAVEAT,
  MISSING_INSTRUMENTATION_COPY,
  PADDLE_MUTATION_LABELS,
  toObservedAtFilterIso,
} from "@/lib/platform-paddle";

describe("Story 44.5 paddle parsers", () => {
  it("maps config without secrets", async () => {
    const config = await getPlatformOpsPaddleConfig(
      async () =>
        new Response(
          JSON.stringify({
            isConfigured: true,
            environment: "sandbox",
            allowLive: false,
            apiHost: "https://sandbox-api.paddle.com",
          })
        )
    );
    expect(config.isConfigured).toBe(true);
    expect(config.environment).toBe("sandbox");
    expect(environmentLabel(config.environment, config.allowLive)).toBe("Sandbox setting");
  });

  it("rejects config that leaks secrets", () => {
    expect(() =>
      parsePlatformOpsPaddleConfig({
        isConfigured: true,
        environment: "sandbox",
        allowLive: false,
        apiHost: "https://sandbox-api.paddle.com",
        webhookSecret: "pdl_ntfset_leak",
      })
    ).toThrow(/secret/i);
  });

  it("maps deliveries and clamps page size", async () => {
    const list = await getPlatformOpsPaddleDeliveries(
      async (input) => {
        const url = new URL(input, "http://localhost");
        expect(url.searchParams.get("pageSize")).toBe("50");
        return new Response(
          JSON.stringify({
            items: [
              {
                id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                eventId: "evt_1",
                eventType: "transaction.completed",
                disposition: "Processed",
                tenantId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                httpStatus: 200,
                detailSanitized: "Processed.",
                observedAt: "2026-10-09T12:00:00Z",
              },
            ],
            page: 1,
            pageSize: 50,
            totalCount: 1,
          })
        );
      },
      { pageSize: 100, disposition: "Processed" }
    );
    expect(list.items[0]?.disposition).toBe("Processed");
    expect(list.pageSize).toBe(50);
  });

  it("rejects oversized sanitized detail", () => {
    expect(() =>
      parsePlatformOpsPaddleDeliveryList({
        items: [
          {
            id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            disposition: "Rejected",
            httpStatus: 400,
            detailSanitized: "x".repeat(201),
            observedAt: "2026-10-09T12:00:00Z",
          },
        ],
        page: 1,
        pageSize: 25,
        totalCount: 1,
      })
    ).toThrow(/detailSanitized/i);
  });

  it("treats datetime-local as UTC", () => {
    expect(toObservedAtFilterIso("2026-06-01T00:00")).toBe("2026-06-01T00:00:00.000Z");
  });

  it("keeps empty-state copy truthful", () => {
    expect(MISSING_INSTRUMENTATION_COPY).toBe("Missing instrumentation");
    expect(MISSING_INSTRUMENTATION_CAVEAT).not.toMatch(/Paddle is down/i);
    expect(MISSING_INSTRUMENTATION_CAVEAT).not.toMatch(/Billing healthy/i);
    expect(MISSING_INSTRUMENTATION_CAVEAT).not.toMatch(/no webhook activity ever/i);
    expect(FILTERED_EMPTY_COPY).toContain("filters");
    expect(PADDLE_MUTATION_LABELS).toContain("Replay");
  });
});
