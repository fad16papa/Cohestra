import { describe, expect, it, vi, afterEach } from "vitest";

import { getPublicApiBaseUrl } from "@/lib/api";

describe("getPublicApiBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses same origin on UAT tenant hosts so handoff avoids cross-origin CORS", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://uat.cohestra.app");
    vi.stubGlobal("window", {
      location: {
        hostname: "creativorare.uat.cohestra.app",
        origin: "https://creativorare.uat.cohestra.app",
      },
    });

    expect(getPublicApiBaseUrl()).toBe("https://creativorare.uat.cohestra.app");
  });

  it("keeps marketing apex on configured PUBLIC API URL", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://uat.cohestra.app");
    vi.stubGlobal("window", {
      location: {
        hostname: "uat.cohestra.app",
        origin: "https://uat.cohestra.app",
      },
    });

    expect(getPublicApiBaseUrl()).toBe("https://uat.cohestra.app");
  });
});
