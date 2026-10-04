import { describe, expect, it } from "vitest";

import { PlanLockedError, SiteRequestError } from "@/lib/plan-entitlement";
import {
  resolveWebsiteRoomAccess,
  websiteFetchDenial,
} from "./website-room-access";

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

describe("resolveWebsiteRoomAccess", () => {
  it("stays pending for missing or unknown plans and never invents a Basic lock", () => {
    expect(resolveWebsiteRoomAccess(null, true)).toEqual({ kind: "loading" });
    expect(resolveWebsiteRoomAccess(null, false, "shell failed")).toEqual({
      kind: "shell-error",
      message: "shell failed",
    });
    expect(resolveWebsiteRoomAccess(shell(null), false).kind).toBe("pending");
    expect(resolveWebsiteRoomAccess(shell("FuturePlan"), false).kind).toBe("pending");
    expect(resolveWebsiteRoomAccess(shell(""), false).kind).toBe("pending");
  });

  it("locks Basic admins and members without opening the editor", () => {
    const basicAdmin = resolveWebsiteRoomAccess(shell("Basic", true), false);
    const basicMember = resolveWebsiteRoomAccess(shell("Basic", false), false);
    expect(basicAdmin).toMatchObject({ kind: "locked", isTenantAdmin: true });
    expect(basicMember).toMatchObject({ kind: "locked", isTenantAdmin: false });
  });

  it("opens Core, Pro, and Enterprise for TenantOperators", () => {
    expect(resolveWebsiteRoomAccess(shell("Core", false), false).kind).toBe("open");
    expect(resolveWebsiteRoomAccess(shell("Pro", true), false).kind).toBe("open");
    expect(resolveWebsiteRoomAccess(shell("Enterprise", false), false).kind).toBe(
      "open"
    );
  });
});

describe("websiteFetchDenial", () => {
  it("keeps role 403 as denial and plan_locked as lock", () => {
    expect(websiteFetchDenial(new SiteRequestError("Your role cannot open Website Studio.", 403)))
      .toMatchObject({ denied: true, planLocked: false });
    expect(
      websiteFetchDenial(
        new PlanLockedError({
          message: "Website requires Core.",
          errorCode: "plan_locked",
          feature: "website",
          requiredPlan: "Core",
        })
      )
    ).toMatchObject({ denied: false, planLocked: true });
    expect(websiteFetchDenial(new SiteRequestError("Site exploded.", 500))).toMatchObject({
      denied: false,
      planLocked: false,
      status: 500,
    });
    expect(websiteFetchDenial(new Error("network down"))).toMatchObject({
      denied: false,
      planLocked: false,
      status: null,
    });
  });
});
