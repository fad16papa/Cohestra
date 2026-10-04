import { describe, expect, it } from "vitest";

import { PlanLockedError } from "@/lib/plan-entitlement";
import { CampaignRequestError } from "@/lib/campaigns-api";
import {
  campaignFetchDenial,
  resolveCampaignRoomAccess,
} from "./campaign-room-access";

function shell(
  plan: string | null,
  isTenantAdmin = true
): {
  plan: string | null;
  isTenantAdmin: boolean;
  isBillingOwner: boolean;
} {
  return { plan, isTenantAdmin, isBillingOwner: isTenantAdmin };
}

describe("resolveCampaignRoomAccess", () => {
  it("stays pending for missing or unknown plans and never invents a Basic lock", () => {
    expect(resolveCampaignRoomAccess(null, true)).toEqual({ kind: "loading" });
    expect(resolveCampaignRoomAccess(shell(null), false).kind).toBe("pending");
    expect(resolveCampaignRoomAccess(shell("FuturePlan"), false).kind).toBe("pending");
    expect(resolveCampaignRoomAccess(shell(""), false).kind).toBe("pending");
  });

  it("locks Basic and Core with ask-admin for members", () => {
    const basicAdmin = resolveCampaignRoomAccess(shell("Basic", true), false);
    const coreMember = resolveCampaignRoomAccess(shell("Core", false), false);
    expect(basicAdmin).toMatchObject({ kind: "locked", isTenantAdmin: true });
    expect(coreMember).toMatchObject({ kind: "locked", isTenantAdmin: false });
  });

  it("opens Pro and Enterprise for operators", () => {
    expect(resolveCampaignRoomAccess(shell("Pro", false), false).kind).toBe("open");
    expect(resolveCampaignRoomAccess(shell("Enterprise", true), false).kind).toBe(
      "open"
    );
  });
});

describe("campaignFetchDenial", () => {
  it("keeps role 403 as denial and plan_locked as lock", () => {
    expect(
      campaignFetchDenial(new CampaignRequestError("Your role cannot open Campaigns.", 403))
    ).toMatchObject({ denied: true, planLocked: false });
    expect(
      campaignFetchDenial(
        new PlanLockedError({
          message: "Campaigns require Pro.",
          errorCode: "plan_locked",
          feature: "campaigns",
          requiredPlan: "Pro",
        })
      )
    ).toMatchObject({ denied: false, planLocked: true });
  });
});
