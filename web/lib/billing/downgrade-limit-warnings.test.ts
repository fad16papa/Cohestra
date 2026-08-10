import { describe, expect, it } from "vitest";

import { getDowngradeLimitWarnings } from "@/lib/billing/downgrade-limit-warnings";
import type { TenantShell } from "@/lib/shell/tenant-shell-api";

function shellWithUsage(usage: TenantShell["usage"]): TenantShell {
  return {
    plan: "Pro",
    billingStatus: "Trialing",
    billingInterval: "Monthly",
    trialEndsAt: null,
    isComplimentary: false,
    isTenantAdmin: true,
    isBillingOwner: true,
    billingOwnerEmail: "admin@example.com",
    tenantSlug: "acme",
    tenantName: "Acme",
    registrationTimeZoneId: "UTC",
    registrationMonthResetsAt: null,
    limits: {
      seats: 10,
      communities: 10,
      publishedActivities: 50,
      registrationsPerMonth: 5000,
    },
    usage,
    limitDials: [],
    billingBanner: null,
  };
}

describe("downgrade-limit-warnings", () => {
  it("warns when communities exceed Core limits", () => {
    const warnings = getDowngradeLimitWarnings(
      shellWithUsage({
        seatsUsed: 2,
        communities: 10,
        publishedActivities: 5,
        registrationsThisMonth: 100,
      }),
      "core",
      {
        usage: {
          seatsUsed: 2,
          communities: 10,
          publishedActivities: 5,
          registrationsThisMonth: 100,
        },
        coreLimits: {
          seats: 3,
          communities: 3,
          publishedActivities: 12,
          registrationsPerMonth: 500,
        },
        proLimits: {
          seats: 10,
          communities: 10,
          publishedActivities: 50,
          registrationsPerMonth: 5000,
        },
      }
    );

    expect(warnings.some((line) => line.includes("Communities"))).toBe(true);
  });

  it("returns no warnings when usage fits Core limits", () => {
    const warnings = getDowngradeLimitWarnings(
      shellWithUsage({
        seatsUsed: 2,
        communities: 2,
        publishedActivities: 5,
        registrationsThisMonth: 100,
      }),
      "core",
      {
        usage: {
          seatsUsed: 2,
          communities: 2,
          publishedActivities: 5,
          registrationsThisMonth: 100,
        },
        coreLimits: {
          seats: 3,
          communities: 3,
          publishedActivities: 12,
          registrationsPerMonth: 500,
        },
        proLimits: {
          seats: 10,
          communities: 10,
          publishedActivities: 50,
          registrationsPerMonth: 5000,
        },
      }
    );

    expect(warnings).toEqual([]);
  });
});
