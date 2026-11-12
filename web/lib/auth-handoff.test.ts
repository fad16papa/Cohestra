import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  getPublicApiBaseUrl: () => "http://test-api",
}));

function handoffResponse() {
  return new Response(
    JSON.stringify({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresInSeconds: 3600,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

describe("exchangeAuthHandoffOnce", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("deduplicates concurrent exchanges for the same code", async () => {
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(handoffResponse()));

    const { exchangeAuthHandoffOnce } = await import("@/lib/auth-handoff");

    const [first, second] = await Promise.all([
      exchangeAuthHandoffOnce("code-a"),
      exchangeAuthHandoffOnce("code-a"),
    ]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
  });

  it("posts again for a different handoff code", async () => {
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(handoffResponse()));

    const { exchangeAuthHandoffOnce } = await import("@/lib/auth-handoff");

    await exchangeAuthHandoffOnce("code-a");
    await exchangeAuthHandoffOnce("code-b");

    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
