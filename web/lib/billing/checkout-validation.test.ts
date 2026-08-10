import { describe, expect, it } from "vitest";

import {
  checkoutActionLabel,
  hasActivePaidSubscription,
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
});
