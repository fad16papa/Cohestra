import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { submitWebsiteInquiry } from "@/lib/website-inquiry-api";

describe("submitWebsiteInquiry", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success payload on 201", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "created",
          message: "Thank you!",
          clientId: "client-123",
          clientCreated: true,
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await submitWebsiteInquiry({
      name: "Alex",
      email: "alex@example.com",
      message: "Hello",
      consentGiven: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.clientId).toBe("client-123");
      expect(result.clientCreated).toBe(true);
    }
  });

  it("returns plan_locked error on 403", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          title: "Plan locked",
          detail: "Upgrade required.",
          extensions: { errorCode: "plan_locked" },
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/problem+json" },
        }
      )
    );

    const result = await submitWebsiteInquiry({
      name: "Alex",
      email: "alex@example.com",
      message: "Hello",
      consentGiven: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("plan_locked");
      expect(result.status).toBe(403);
    }
  });
});
