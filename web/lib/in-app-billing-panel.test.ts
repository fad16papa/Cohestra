/** @vitest-environment jsdom */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { createElement, act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BILLING_UNAVAILABLE_COPY } from "@/lib/billing/billing-api";
import type { BillingDetails } from "@/lib/billing/billing-details-api";
import type { BillingSummary } from "@/lib/billing/billing-api";

const billingMocks = vi.hoisted(() => ({
  configured: true as boolean,
  details: null as BillingDetails | null,
}));

function summary(partial: Partial<BillingSummary> = {}): BillingSummary {
  return {
    plan: "Pro",
    billingStatus: "Active",
    billingInterval: "month",
    trialEndsAt: null,
    hasConsumedTrial: false,
    billingConfigured: billingMocks.configured,
    clientToken: null,
    trialPeriodDays: 30,
    isComplimentary: false,
    usage: null,
    coreLimits: null,
    proLimits: null,
    scheduledPlan: null,
    scheduledPlanEffectiveAt: null,
    scheduledBillingInterval: null,
    ...partial,
  };
}

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({
    authFetch: vi.fn(),
    profile: { email: "owner@cohestra.local" },
  }),
}));

vi.mock("@/components/shell/upgrade-panel", () => ({
  UpgradePanel: () =>
    createElement("div", { "data-testid": "upgrade-panel" }, "Upgrade your workspace"),
}));

vi.mock("@/lib/billing/billing-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/billing/billing-api")>();
  return {
    ...actual,
    fetchBillingSummaryWithAuth: async () => summary({ plan: "Basic", billingStatus: "Free" }),
    reconcileBillingFromProviderWithAuth: async () => ({
      synced: false,
      summary: summary({ plan: "Basic", billingStatus: "Free" }),
    }),
  };
});

vi.mock("@/lib/billing/billing-details-api", () => ({
  fetchBillingDetailsWithAuth: async () => {
    if (!billingMocks.details) {
      throw new Error("Could not load billing details.");
    }
    return billingMocks.details;
  },
  cancelSubscriptionWithAuth: vi.fn(),
  cancelScheduledPlanChangeWithAuth: vi.fn(),
  resumeSubscriptionWithAuth: vi.fn(),
  updateBillingContactWithAuth: vi.fn(),
}));

import { InAppBillingPanel } from "@/components/billing/in-app-billing-panel";

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("InAppBillingPanel presentation", () => {
  let rootEl: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    billingMocks.configured = true;
    billingMocks.details = null;
    rootEl = document.createElement("div");
    document.body.append(rootEl);
    root = createRoot(rootEl);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    rootEl.remove();
  });

  it("hides paid billing actions when the shell plan is missing or unknown", async () => {
    await act(async () => {
      root.render(
        createElement(InAppBillingPanel, {
          shellPlan: null,
          shellBillingStatus: "Free",
          shellTrialEndsAt: null,
          onRefreshShell: async () => undefined,
        })
      );
    });

    expect(rootEl.textContent).toMatch(/plan is not available yet/i);
    expect(rootEl.querySelector("a[href*='/billing/checkout']")).toBeNull();
    expect(rootEl.textContent).not.toMatch(/change plan|start .* trial/i);

    await act(async () => {
      root.render(
        createElement(InAppBillingPanel, {
          shellPlan: "Platinum",
          shellBillingStatus: "Free",
          shellTrialEndsAt: null,
          onRefreshShell: async () => undefined,
        })
      );
    });

    expect(rootEl.textContent).toMatch(/plan is not available yet/i);
    expect(rootEl.querySelector("a[href*='/billing/checkout']")).toBeNull();
  });

  it("presents Basic as a valid plan with upgrade, not an error", async () => {
    await act(async () => {
      root.render(
        createElement(InAppBillingPanel, {
          shellPlan: "Basic",
          shellBillingStatus: "Free",
          shellTrialEndsAt: null,
          onRefreshShell: async () => undefined,
        })
      );
    });
    await flush();

    expect(rootEl.textContent).toMatch(/Plan:\s*Basic/i);
    expect(rootEl.textContent).toMatch(/No paid subscription/i);
    expect(rootEl.querySelector("[data-testid='upgrade-panel']")).not.toBeNull();
    expect(rootEl.textContent).not.toMatch(/workspace paused|you don't have permission/i);
  });

  it("keeps provider-unavailable copy calm for Basic and still shows the plan", async () => {
    billingMocks.configured = false;
    await act(async () => {
      root.render(
        createElement(InAppBillingPanel, {
          shellPlan: "Basic",
          shellBillingStatus: "Free",
          shellTrialEndsAt: null,
          onRefreshShell: async () => undefined,
        })
      );
    });
    await flush();

    expect(rootEl.textContent).toMatch(/Plan:\s*Basic/i);
    expect(rootEl.textContent).toContain(BILLING_UNAVAILABLE_COPY);
    expect(rootEl.querySelector("[data-testid='upgrade-panel']")).toBeNull();
    expect(rootEl.textContent).toMatch(/refresh billing status/i);
  });

  it("hides checkout for complimentary Basic", async () => {
    await act(async () => {
      root.render(
        createElement(InAppBillingPanel, {
          shellPlan: "Basic",
          shellBillingStatus: "Free",
          shellTrialEndsAt: null,
          isComplimentary: true,
          onRefreshShell: async () => undefined,
        })
      );
    });
    await flush();

    expect(rootEl.textContent).toMatch(/complimentary plan/i);
    expect(rootEl.querySelector("[data-testid='upgrade-panel']")).toBeNull();
  });

  it("humanizes Trialing, PastDue, and OnHold without Suspended language", async () => {
    billingMocks.details = {
      summary: summary(),
      contact: null,
      paymentMethod: null,
      subscription: {
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        scheduledPlan: null,
        scheduledPlanEffectiveAt: null,
      },
      invoices: [],
    };

    const trialEndsAt = new Date(Date.now() + 3 * 86_400_000).toISOString();
    await act(async () => {
      root.render(
        createElement(InAppBillingPanel, {
          shellPlan: "Pro",
          shellBillingStatus: "Trialing",
          shellTrialEndsAt: trialEndsAt,
          onRefreshShell: async () => undefined,
        })
      );
    });
    await flush();
    expect(rootEl.textContent).toMatch(/Trialing|Trial —/i);
    expect(rootEl.querySelector("[role='alert']")).toBeNull();
    expect(rootEl.textContent).not.toMatch(/workspace paused/i);

    await act(async () => {
      root.render(
        createElement(InAppBillingPanel, {
          shellPlan: "Pro",
          shellBillingStatus: "PastDue",
          shellTrialEndsAt: trialEndsAt,
          onRefreshShell: async () => undefined,
        })
      );
    });
    await flush();
    expect(rootEl.textContent).toMatch(/Payment is past due/i);
    expect(rootEl.querySelector("[role='alert']")?.textContent).toMatch(/payment method/i);
    expect(rootEl.textContent).not.toMatch(/workspace paused|on hold|Trial —/i);

    await act(async () => {
      root.render(
        createElement(InAppBillingPanel, {
          shellPlan: "Pro",
          shellBillingStatus: "OnHold",
          shellTrialEndsAt: trialEndsAt,
          onRefreshShell: async () => undefined,
        })
      );
    });
    await flush();
    expect(rootEl.textContent).toMatch(/Billing is on hold/i);
    expect(rootEl.textContent).toMatch(/read-only/i);
    expect(rootEl.textContent).not.toMatch(/workspace paused|Trial —/i);
  });
});
