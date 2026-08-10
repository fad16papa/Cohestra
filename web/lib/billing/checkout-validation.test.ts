import { describe, expect, it } from "vitest";

import {
  checkoutActionLabel,
  formatScheduledChangeLabel,
  hasActivePaidSubscription,
  hasPendingPaidScheduleChange,
  isBillingIntervalDowngrade,
  isDeferredPlanChange,
  isPaidPlanDowngrade,
  isSamePlanAndInterval,
  matchesScheduledPlanChange,
} from "@/lib/billing/checkout-validation";

describe("checkout-validation", () => {
  it("detects Pro to Core downgrade", () => {
    expect(isPaidPlanDowngrade("Pro", "core")).toBe(true);
    expect(isPaidPlanDowngrade("Core", "pro")).toBe(false);
  });

  it("detects annual to monthly interval downgrade", () => {
    expect(isBillingIntervalDowngrade("Annual", "monthly")).toBe(true);
    expect(isBillingIntervalDowngrade("Monthly", "monthly")).toBe(false);
    expect(isBillingIntervalDowngrade("Annual", "annual")).toBe(false);
  });

  it("defers tier downgrades and same-tier interval downgrades for Core and Pro", () => {
    expect(isDeferredPlanChange("Pro", "Monthly", "core", "monthly")).toBe(true);
    expect(isDeferredPlanChange("Core", "Monthly", "pro", "monthly")).toBe(false);
    expect(isDeferredPlanChange("Pro", "Annual", "pro", "monthly")).toBe(true);
    expect(isDeferredPlanChange("Core", "Annual", "core", "monthly")).toBe(true);
    expect(isDeferredPlanChange("Core", "Monthly", "core", "annual")).toBe(false);
  });

  it("detects same plan and interval", () => {
    expect(isSamePlanAndInterval("Pro", "Monthly", "pro", "monthly")).toBe(true);
    expect(isSamePlanAndInterval("Pro", "Monthly", "pro", "annual")).toBe(false);
  });

  it("matches scheduled plan and interval", () => {
    expect(matchesScheduledPlanChange("Core", "Monthly", "core", "monthly")).toBe(true);
    expect(matchesScheduledPlanChange("Core", "Annual", "core", "monthly")).toBe(false);
    expect(matchesScheduledPlanChange("Core", null, "core", "monthly")).toBe(false);
    expect(matchesScheduledPlanChange("Core", "", "core", "monthly")).toBe(false);
  });

  it("does not defer tier upgrade with interval downgrade combo", () => {
    expect(isDeferredPlanChange("Core", "Annual", "pro", "monthly")).toBe(false);
  });

  it("labels deferred tier change at period end", () => {
    expect(
      checkoutActionLabel({
        billingStatus: "Trialing",
        currentPlan: "Pro",
        hasConsumedTrial: true,
        targetPlan: "core",
        targetInterval: "monthly",
        currentInterval: "Monthly",
      })
    ).toBe("Switch to Core at period end");
  });

  it("labels deferred interval change at period end", () => {
    expect(
      checkoutActionLabel({
        billingStatus: "Active",
        currentPlan: "Core",
        hasConsumedTrial: true,
        targetPlan: "core",
        targetInterval: "monthly",
        currentInterval: "Annual",
      })
    ).toBe("Switch to monthly billing at period end");
  });

  it("labels immediate tier upgrade symmetrically", () => {
    expect(
      checkoutActionLabel({
        billingStatus: "Active",
        currentPlan: "Core",
        hasConsumedTrial: true,
        targetPlan: "pro",
        targetInterval: "monthly",
        currentInterval: "Monthly",
      })
    ).toBe("Switch to Pro now");
  });

  it("recognizes active paid subscription statuses", () => {
    expect(hasActivePaidSubscription("Trialing")).toBe(true);
    expect(hasActivePaidSubscription("Free")).toBe(false);
  });

  it("detects pending paid schedule changes for resume confirm", () => {
    expect(
      hasPendingPaidScheduleChange({
        scheduledPlan: "Core",
        scheduledPlanEffectiveAt: "2026-09-01T00:00:00Z",
      })
    ).toBe(true);
    expect(
      hasPendingPaidScheduleChange({
        scheduledPlan: "Basic",
        scheduledPlanEffectiveAt: "2026-09-01T00:00:00Z",
      })
    ).toBe(false);
    expect(hasPendingPaidScheduleChange(null)).toBe(false);
  });

  it("formats interval-only scheduled change labels", () => {
    expect(formatScheduledChangeLabel("Pro", "Monthly", "Pro")).toBe("monthly billing");
    expect(formatScheduledChangeLabel("Pro", "Annual", "Pro")).toBe("yearly billing");
    expect(formatScheduledChangeLabel("Core", "Monthly", "Pro")).toBe("Core");
  });

  it("supports cancel confirm copy for interval-only vs tier schedules", () => {
    const intervalLabel = formatScheduledChangeLabel(
      "Pro",
      "Monthly",
      "Pro"
    );
    expect(`Your scheduled switch to ${intervalLabel} will be cancelled`).toContain(
      "monthly billing"
    );

    const tierLabel = formatScheduledChangeLabel("Core", "Monthly", "Pro");
    expect(tierLabel).toBe("Core");
  });
});
