import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchSiteAdmin } from "@/lib/site-admin-api";
import { PlanLockedError } from "@/lib/plan-entitlement";

describe("fetchSiteAdmin entitlement", () => {
  const authFetch = vi.fn();

  beforeEach(() => {
    authFetch.mockReset();
  });

  it("throws PlanLockedError on 403 plan_locked", async () => {
    authFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          title: "Forbidden",
          detail: "Site pages require a Core plan or higher.",
          errorCode: "plan_locked",
          feature: "website",
          requiredPlan: "Core",
        }),
        { status: 403, headers: { "Content-Type": "application/problem+json" } }
      )
    );

    await expect(fetchSiteAdmin(authFetch)).rejects.toBeInstanceOf(PlanLockedError);
  });

  it("throws a generic Error on unexpected 500", async () => {
    authFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          title: "An unexpected error occurred.",
          detail: "See server logs for details.",
        }),
        { status: 500, headers: { "Content-Type": "application/problem+json" } }
      )
    );

    await expect(fetchSiteAdmin(authFetch)).rejects.toEqual(
      expect.objectContaining({
        name: "Error",
        message: "See server logs for details.",
      })
    );
  });
});
