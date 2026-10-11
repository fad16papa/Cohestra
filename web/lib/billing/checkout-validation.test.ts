import { describe, expect, it } from "vitest";

import {
  checkoutActionLabel,
  checkoutImmediateChangeCopy,
  checkoutPastDueMessage,
  checkoutPriceCaption,
  formatScheduledChangeLabel,
  hasActivePaidSubscription,
  hasPendingPaidScheduleChange,
  isBillingIntervalDowngrade,
  isBillingIntervalUpgrade,
  isDeferredPlanChange,
  isPaidPlanDowngrade,
  isSamePlanAndInterval,
  matchesScheduledPlanChange,
  requiresImmediateChargeConfirmation,
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

  it("detects monthly to annual interval upgrade", () => {
    expect(isBillingIntervalUpgrade("Monthly", "annual")).toBe(true);
    expect(isBillingIntervalUpgrade("Annual", "annual")).toBe(false);
    expect(isBillingIntervalUpgrade("Monthly", "monthly")).toBe(false);
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

  it("labels past due before any plan change", () => {
    expect(
      checkoutActionLabel({
        billingStatus: "PastDue",
        currentPlan: "Pro",
        hasConsumedTrial: true,
        targetPlan: "pro",
        targetInterval: "annual",
        currentInterval: "Monthly",
      })
    ).toBe("Update payment method to change plans");
  });

  it("describes trial and yearly-now immediate copy", () => {
    expect(
      checkoutImmediateChangeCopy({
        billingStatus: "Trialing",
        currentInterval: "Monthly",
        targetInterval: "annual",
        trialEndsAt: "2026-11-10T00:00:00Z",
      })
    ).toMatch(/without a charge/i);
    expect(
      checkoutImmediateChangeCopy({
        billingStatus: "Active",
        currentInterval: "Monthly",
        targetInterval: "annual",
        trialEndsAt: null,
      })
    ).toMatch(/Yearly billing starts now/);
    expect(
      checkoutImmediateChangeCopy({
        billingStatus: "Active",
        currentInterval: "Monthly",
        targetInterval: "monthly",
        trialEndsAt: null,
      })
    ).toMatch(/next invoice/);
  });

  it("requires confirmation only for active frequency upgrades", () => {
    expect(
      requiresImmediateChargeConfirmation({
        billingStatus: "Active",
        currentInterval: "Monthly",
        targetInterval: "annual",
      })
    ).toBe(true);
    expect(
      requiresImmediateChargeConfirmation({
        billingStatus: "Trialing",
        currentInterval: "Monthly",
        targetInterval: "annual",
      })
    ).toBe(false);
    expect(
      requiresImmediateChargeConfirmation({
        billingStatus: "Active",
        currentInterval: "Monthly",
        targetInterval: "monthly",
      })
    ).toBe(false);
  });

  it("captions yearly-now separately from next-invoice upgrades", () => {
    expect(
      checkoutPriceCaption({
        billingStatus: "Active",
        trialEndsAt: null,
        hasConsumedTrial: true,
        currentInterval: "Monthly",
        targetInterval: "annual",
      })
    ).toBe("Starts now with prorated credit");
    expect(
      checkoutPriceCaption({
        billingStatus: "Active",
        trialEndsAt: null,
        hasConsumedTrial: true,
        currentInterval: "Monthly",
        targetInterval: "monthly",
      })
    ).toBe("Billed on your next invoice");
  });

  it("exposes the past-due billing message", () => {
    expect(checkoutPastDueMessage()).toMatch(/past due/i);
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
    expect(formatScheduledChangeLabel("Pro", "Monthly", null)).toBe("Pro");
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
