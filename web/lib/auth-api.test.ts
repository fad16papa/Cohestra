import { describe, expect, it } from "vitest";

import {
  loginAudienceMismatch,
  OPERATOR_LOGIN_PATH,
  PLATFORM_LOGIN_PATH,
  resolveLoginPath,
  type AdminProfile,
} from "@/lib/auth-api";

function profile(roles: string[]): AdminProfile {
  return {
    userId: "user-1",
    email: "ops@example.com",
    nickname: null,
    roles,
    themePreference: "system",
    brandAccentColor: null,
  };
}

describe("resolveLoginPath", () => {
  it("sends platform routes to the platform door", () => {
    expect(resolveLoginPath("/platform")).toBe(PLATFORM_LOGIN_PATH);
    expect(resolveLoginPath("/platform/support")).toBe(PLATFORM_LOGIN_PATH);
  });

  it("sends operator routes to the tenant door", () => {
    expect(resolveLoginPath("/dashboard")).toBe(OPERATOR_LOGIN_PATH);
    expect(resolveLoginPath("/login")).toBe(OPERATOR_LOGIN_PATH);
  });
});

describe("loginAudienceMismatch", () => {
  it("rejects tenant admins on the platform door", () => {
    const mismatch = loginAudienceMismatch(
      "platform",
      profile(["TenantAdmin"])
    );
    expect(mismatch?.otherDoorPath).toBe(OPERATOR_LOGIN_PATH);
    expect(mismatch?.message).toMatch(/platform admins only/i);
  });

  it("rejects platform admins on the operator door", () => {
    const mismatch = loginAudienceMismatch(
      "operator",
      profile(["PlatformAdmin"])
    );
    expect(mismatch?.otherDoorPath).toBe(PLATFORM_LOGIN_PATH);
    expect(mismatch?.message).toMatch(/workspace operators/i);
  });

  it("allows matching audiences", () => {
    expect(
      loginAudienceMismatch("platform", profile(["PlatformAdmin"]))
    ).toBeNull();
    expect(
      loginAudienceMismatch("operator", profile(["TenantAdmin"]))
    ).toBeNull();
  });
});
