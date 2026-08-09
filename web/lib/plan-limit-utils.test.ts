import { describe, expect, it } from "vitest";

import type { TenantShell } from "@/lib/shell/tenant-shell-api";
import {
  getActivitiesAtCapBannerState,
  getPublishedActivitiesUsageCount,
  shouldShowActivitiesRecoveryChips,
  shouldShowPublishedOnlyChip,
} from "@/lib/plan-limit-utils";

function shellWithDials(
  published: { used: number; limit: number; blocked?: boolean; warn?: boolean },
  registrations: {
    used: number;
    limit: number;
    blocked?: boolean;
    warn?: boolean;
  } = { used: 0, limit: 5000, blocked: false, warn: false }
): TenantShell {
  return {
    plan: "Pro",
    billingStatus: "active",
    billingInterval: "month",
    trialEndsAt: null,
    isComplimentary: false,
    isTenantAdmin: true,
    tenantSlug: "demo",
    tenantName: "Demo",
    registrationTimeZoneId: "UTC",
    registrationMonthResetsAt: null,
    limits: {
      seats: 10,
      communities: 10,
      publishedActivities: published.limit,
      registrationsPerMonth: registrations.limit,
    },
    usage: {
      seatsUsed: 1,
      communities: 1,
      publishedActivities: published.used,
      registrationsThisMonth: registrations.used,
    },
    limitDials: [
      {
        key: "published",
        label: "Published activities",
        used: published.used,
        limit: published.limit,
        percent: Math.round((published.used / published.limit) * 100),
        warn: published.warn ?? false,
        blocked: published.blocked ?? false,
        hint: null,
      },
      {
        key: "registrations",
        label: "Monthly registrations",
        used: registrations.used,
        limit: registrations.limit,
        percent: Math.round((registrations.used / registrations.limit) * 100),
        warn: registrations.warn ?? false,
        blocked: registrations.blocked ?? false,
        hint: null,
      },
    ],
    billingBanner: null,
  };
}

describe("getActivitiesAtCapBannerState", () => {
  it("returns null when no dial is at cap or warn", () => {
    expect(
      getActivitiesAtCapBannerState(
        shellWithDials({ used: 10, limit: 50, blocked: false, warn: false })
      )
    ).toBeNull();
  });

  it("combines published and registration lines at dual cap", () => {
    const state = getActivitiesAtCapBannerState(
      shellWithDials(
        { used: 50, limit: 50, blocked: true },
        { used: 5000, limit: 5000, blocked: true }
      )
    );

    expect(state?.variant).toBe("blocked");
    expect(state?.publishedLine).toContain("Published activities at capacity (50/50)");
    expect(state?.registrationsLine).toContain("Monthly sign-ups paused");
    expect(state?.showReviewPublished).toBe(true);
    expect(state?.showUpgradeLink).toBe(true);
  });

  it("uses warn variant when only approaching capacity", () => {
    const state = getActivitiesAtCapBannerState(
      shellWithDials({ used: 40, limit: 50, warn: true })
    );

    expect(state?.variant).toBe("warn");
    expect(state?.publishedLine).toContain("80%");
  });
});

describe("shouldShowActivitiesRecoveryChips", () => {
  it("is false below warn threshold", () => {
    expect(
      shouldShowActivitiesRecoveryChips(
        shellWithDials({ used: 10, limit: 50 })
      )
    ).toBe(false);
  });

  it("is true when published is blocked", () => {
    expect(
      shouldShowActivitiesRecoveryChips(
        shellWithDials({ used: 50, limit: 50, blocked: true })
      )
    ).toBe(true);
  });
});

describe("shouldShowPublishedOnlyChip", () => {
  it("is true when registrations are blocked even if published is not", () => {
    expect(
      shouldShowPublishedOnlyChip(
        shellWithDials(
          { used: 10, limit: 50 },
          { used: 5000, limit: 5000, blocked: true }
        )
      )
    ).toBe(true);
  });
});

describe("getPublishedActivitiesUsageCount", () => {
  it("reads from the published dial", () => {
    expect(
      getPublishedActivitiesUsageCount(
        shellWithDials({ used: 42, limit: 50 })
      )
    ).toBe(42);
  });
});
