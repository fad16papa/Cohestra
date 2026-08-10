import { describe, expect, it } from "vitest";

import {
  checkoutActionLabel,
  hasActivePaidSubscription,
  isPaidPlanDowngrade,
  isSamePlanAndInterval,
} from "@/lib/billing/checkout-validation";

describe("checkout-validation", () => {
  it("detects Pro to Core downgrade", () => {
    expect(isPaidPlanDowngrade("Pro", "core")).toBe(true);
    expect(isPaidPlanDowngrade("Core", "pro")).toBe(false);
  });

  it("detects same plan and interval", () => {
    expect(isSamePlanAndInterval("Pro", "Monthly", "pro", "monthly")).toBe(true);
    expect(isSamePlanAndInterval("Pro", "Monthly", "pro", "annual")).toBe(false);
  });

  it("labels downgrade at period end", () => {
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

  it("labels upgrade for paid tenants", () => {
    expect(
      checkoutActionLabel({
        billingStatus: "Active",
        currentPlan: "Core",
        hasConsumedTrial: true,
        targetPlan: "pro",
        targetInterval: "monthly",
        currentInterval: "Monthly",
      })
    ).toBe("Upgrade to Pro");
  });

  it("recognizes active paid subscription statuses", () => {
    expect(hasActivePaidSubscription("Trialing")).toBe(true);
    expect(hasActivePaidSubscription("Free")).toBe(false);
  });
});
