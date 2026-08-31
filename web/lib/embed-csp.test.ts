import { afterEach, describe, expect, it } from "vitest";

import { resolveMiddlewareApiBaseUrl } from "./embed-csp";

describe("resolveMiddlewareApiBaseUrl", () => {
  const originalApiUrl = process.env.API_URL;
  const originalPublicApiUrl = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    if (originalApiUrl === undefined) {
      delete process.env.API_URL;
    } else {
      process.env.API_URL = originalApiUrl;
    }

    if (originalPublicApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalPublicApiUrl;
    }
  });

  it("prefers API_URL for Docker-internal middleware fetch", () => {
    process.env.API_URL = "http://api:8080";
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8088";

    expect(resolveMiddlewareApiBaseUrl()).toBe("http://api:8080");
  });

  it("falls back to NEXT_PUBLIC_API_URL when API_URL is unset", () => {
    delete process.env.API_URL;
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8080";

    expect(resolveMiddlewareApiBaseUrl()).toBe("http://localhost:8080");
  });
});
