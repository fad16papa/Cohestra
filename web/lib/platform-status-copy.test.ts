import { describe, expect, it } from "vitest";

import { describeBillingStatus } from "@/lib/billing/billing-status-copy";
import {
  describePlatformBillingStatus,
  describePlatformTenantStatus,
} from "@/lib/platform-status-copy";

describe("platform status copy", () => {
  it("keeps Suspended distinct from Billing OnHold", () => {
    const suspended = describePlatformTenantStatus("Suspended");
    const onHold = describePlatformBillingStatus("OnHold");

    expect(suspended.headline).toBe("Workspace paused.");
    expect(suspended.detail).toMatch(/not collections/i);
    expect(onHold.headline).toBe("Billing is on hold.");
    expect(suspended.headline).not.toMatch(/on hold/i);
    expect(onHold.headline).not.toMatch(/paused/i);
    expect(onHold.headline).not.toMatch(/suspend/i);
  });

  it("reuses the shared billing presentation for OnHold", () => {
    expect(describePlatformBillingStatus("OnHold")).toEqual(
      describeBillingStatus("OnHold")
    );
  });
});
