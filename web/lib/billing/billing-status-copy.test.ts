import { describe, expect, it } from "vitest";

import {
  CHECKOUT_INCOMPLETE_COPY,
  allowSandboxBillingCopy,
  checkoutIncompleteCopy,
  describeBillingStatus,
  formatTrialRemaining,
  paddleReturnCollectingCopy,
} from "@/lib/billing/billing-status-copy";

describe("billing-status-copy", () => {
  it("formats trial remaining without inventing a countdown from missing dates", () => {
    expect(formatTrialRemaining(null)).toBeNull();
    expect(formatTrialRemaining("not-a-date")).toBeNull();
    const inTwoDays = new Date(Date.now() + 2 * 86_400_000).toISOString();
    expect(formatTrialRemaining(inTwoDays)).toMatch(/^Trial — \d+ days left$/);
  });

  it("keeps PastDue and OnHold distinct from Suspended language", () => {
    const pastDue = describeBillingStatus("PastDue");
    expect(pastDue.headline).toBe("Payment is past due.");
    expect(pastDue.attention).toBe("alert");
    expect(`${pastDue.headline} ${pastDue.detail}`).not.toMatch(/paused|on hold/i);

    const onHold = describeBillingStatus("OnHold");
    expect(onHold.headline).toBe("Billing is on hold.");
    expect(onHold.detail).toMatch(/read-only/i);
    expect(`${onHold.headline} ${onHold.detail}`).not.toMatch(/workspace paused/i);
  });

  it("does not treat Trialing as an alarm", () => {
    expect(describeBillingStatus("Trialing").attention).toBe("status");
  });

  it("keeps incomplete checkout production-safe unless the Paddle token is sandbox", () => {
    expect(checkoutIncompleteCopy(null)).toBe(CHECKOUT_INCOMPLETE_COPY);
    expect(checkoutIncompleteCopy("live_abc")).toBe(CHECKOUT_INCOMPLETE_COPY);
    expect(checkoutIncompleteCopy("live_abc")).not.toMatch(/4242|Notifications/i);
    expect(allowSandboxBillingCopy("test_abc")).toBe(true);
    expect(checkoutIncompleteCopy("test_abc")).toMatch(/4242/);
    expect(paddleReturnCollectingCopy("live_abc")).not.toMatch(/4242/);
    expect(paddleReturnCollectingCopy("test_abc")).toMatch(/4242/);
  });
});
