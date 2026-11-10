import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const TENANT = readFileSync(
  resolve(import.meta.dirname, "../app/(platform)/platform/tenants/[id]/page.tsx"),
  "utf8"
);
const INVITE_ACCEPT = readFileSync(
  resolve(import.meta.dirname, "../components/team/invite-accept-page-client.tsx"),
  "utf8"
);

describe("first-admin invite activation source contract", () => {
  it("platform tenant lifecycle exposes first-admin invitation with confirmation", () => {
    expect(TENANT).toContain("Send first-admin invitation");
    expect(TENANT).toContain("bootstrapFirstAdmin");
    expect(TENANT).toContain("AlertDialog");
    expect(TENANT).toContain("canBootstrapFirstAdmin");
    expect(TENANT).toMatch(/tenant\.isComplimentary[\s\S]*tenant\.status === "Active"/);
    expect(TENANT).toContain("DEFAULT_TENANT_ID");
  });

  it("invite accept branches on requiresActivationOtp without acceptTeamInvite in OTP path", () => {
    expect(INVITE_ACCEPT).toContain("requiresActivationOtp");
    expect(INVITE_ACCEPT).toContain("InviteActivationForm");
    expect(INVITE_ACCEPT).toContain("startInviteActivation");
    expect(INVITE_ACCEPT).toContain("verifyInviteActivation");

    const activationStart = INVITE_ACCEPT.indexOf("function InviteActivationForm");
    const activationEnd = INVITE_ACCEPT.indexOf("function InviteAcceptForm");
    expect(activationStart).toBeGreaterThan(-1);
    expect(activationEnd).toBeGreaterThan(activationStart);
    const activationBlock = INVITE_ACCEPT.slice(activationStart, activationEnd);
    expect(activationBlock).not.toContain("acceptTeamInvite");
  });
});
