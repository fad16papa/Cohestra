import { describe, expect, it } from "vitest";

import {
  PLAN_LOCKED_ERROR_CODE,
  PlanLockedError,
  isPlanLockedError,
  planLockedFromProblem,
  shouldSkipWebsiteAdminFetch,
  throwIfSiteRequestFailed,
} from "@/lib/plan-entitlement";
import { parseProblemFields } from "@/lib/problem-details";

describe("website plan entitlement helpers", () => {
  it("skips the Website admin fetch only for Basic", () => {
    expect(shouldSkipWebsiteAdminFetch("Basic")).toBe(true);
    expect(shouldSkipWebsiteAdminFetch("Core")).toBe(false);
    expect(shouldSkipWebsiteAdminFetch("Pro")).toBe(false);
    expect(shouldSkipWebsiteAdminFetch("Enterprise")).toBe(false);
    expect(shouldSkipWebsiteAdminFetch(undefined)).toBe(false);
  });

  it("recognizes only 403 plan_locked as an upgrade-required error", () => {
    const locked = planLockedFromProblem(
      {
        message: "Site pages require a Core plan or higher.",
        errorCode: PLAN_LOCKED_ERROR_CODE,
        feature: "website",
        requiredPlan: "Core",
      },
      403
    );
    expect(locked).toBeInstanceOf(PlanLockedError);
    expect(locked?.feature).toBe("website");
    expect(locked?.requiredPlan).toBe("Core");

    expect(
      planLockedFromProblem(
        { message: "Forbidden", errorCode: "billing_on_hold" },
        403
      )
    ).toBeNull();
    expect(
      planLockedFromProblem(
        { message: "Boom", errorCode: PLAN_LOCKED_ERROR_CODE },
        500
      )
    ).toBeNull();
    expect(isPlanLockedError(new Error("Site pages require a Core plan or higher."))).toBe(
      false
    );
  });

  it("throws PlanLockedError from a structured 403 ProblemDetails body", async () => {
    const response = new Response(
      JSON.stringify({
        title: "Forbidden",
        detail: "Site pages require a Core plan or higher.",
        errorCode: "plan_locked",
        feature: "website",
        requiredPlan: "Core",
      }),
      { status: 403, headers: { "Content-Type": "application/problem+json" } }
    );

    await expect(throwIfSiteRequestFailed(response)).rejects.toMatchObject({
      name: "PlanLockedError",
      errorCode: "plan_locked",
      feature: "website",
      requiredPlan: "Core",
    });
  });

  it("does not treat a 500 or role 403 as plan lock", async () => {
    await expect(
      throwIfSiteRequestFailed(
        new Response(
          JSON.stringify({
            title: "An unexpected error occurred.",
            detail: "See server logs for details.",
          }),
          { status: 500, headers: { "Content-Type": "application/problem+json" } }
        )
      )
    ).rejects.toEqual(expect.objectContaining({
      name: "Error",
      message: "See server logs for details.",
    }));

    await expect(
      throwIfSiteRequestFailed(
        new Response(
          JSON.stringify({ title: "Forbidden", detail: "Forbidden" }),
          { status: 403, headers: { "Content-Type": "application/problem+json" } }
        )
      )
    ).rejects.toEqual(expect.objectContaining({
      name: "Error",
      message: "Forbidden",
    }));
  });

  it("reads feature and requiredPlan from ProblemDetails extensions", () => {
    const parsed = parseProblemFields({
      detail: "Upgrade required.",
      extensions: { errorCode: "plan_locked", feature: "website", requiredPlan: "Core" },
    });
    expect(parsed.errorCode).toBe("plan_locked");
    expect(parsed.feature).toBe("website");
    expect(parsed.requiredPlan).toBe("Core");
  });
});
