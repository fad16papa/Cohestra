import { describe, expect, it } from "vitest";

import {
  REVIEW_DIALOG_CLASS_NAME,
  canConfirmImmediatePreview,
  formatProviderMoney,
  PREVIEW_FAILURE_COPY,
  providerMoneyAriaLabel,
  requiresProviderPreview,
  STALE_PREVIEW_COPY,
  successShowsAmount,
  visiblePreviewLines,
  type PlanChangePreview,
} from "@/lib/billing/plan-change-review";

function preview(overrides: Partial<PlanChangePreview> = {}): PlanChangePreview {
  return {
    currentPlan: "Pro",
    currentInterval: "Monthly",
    targetPlan: "Pro",
    targetInterval: "Annual",
    currency: "USD",
    credit: { amountMinor: 1500, currency: "USD" },
    dueNow: { amountMinor: 8400, currency: "USD" },
    nextRecurringAmount: { amountMinor: 9900, currency: "USD" },
    nextBilledAt: "2027-10-12T00:00:00Z",
    providerPreviewAvailable: true,
    deferred: false,
    previewState: "abc",
    reviewCopy: "Yearly billing starts now.",
    confirmLabel: "Confirm yearly billing",
    ...overrides,
  };
}

describe("plan-change-review", () => {
  it("requires provider preview for immediate paid catalog changes", () => {
    expect(
      requiresProviderPreview({
        billingStatus: "Active",
        currentPlan: "Pro",
        targetPlan: "pro",
        currentInterval: "Monthly",
        targetInterval: "annual",
      })
    ).toBe(true);
    expect(
      requiresProviderPreview({
        billingStatus: "Active",
        currentPlan: "Core",
        targetPlan: "pro",
        currentInterval: "Monthly",
        targetInterval: "monthly",
      })
    ).toBe(true);
    expect(
      requiresProviderPreview({
        billingStatus: "Trialing",
        currentPlan: "Pro",
        targetPlan: "pro",
        currentInterval: "Monthly",
        targetInterval: "annual",
      })
    ).toBe(true);
  });

  it("does not require preview for deferred, past due, or new subscriptions", () => {
    expect(
      requiresProviderPreview({
        billingStatus: "Active",
        currentPlan: "Pro",
        targetPlan: "pro",
        currentInterval: "Annual",
        targetInterval: "monthly",
      })
    ).toBe(false);
    expect(
      requiresProviderPreview({
        billingStatus: "Active",
        currentPlan: "Pro",
        targetPlan: "core",
        currentInterval: "Monthly",
        targetInterval: "monthly",
      })
    ).toBe(false);
    expect(
      requiresProviderPreview({
        billingStatus: "PastDue",
        currentPlan: "Pro",
        targetPlan: "pro",
        currentInterval: "Monthly",
        targetInterval: "annual",
      })
    ).toBe(false);
    expect(
      requiresProviderPreview({
        billingStatus: "Free",
        currentPlan: "Basic",
        targetPlan: "pro",
        currentInterval: null,
        targetInterval: "monthly",
      })
    ).toBe(false);
  });

  it("formats integer minor units without guessing missing fields", () => {
    expect(formatProviderMoney(8400, "USD")).toBe("84.00 USD");
    expect(formatProviderMoney(0, "USD")).toBe("0.00 USD");
    expect(formatProviderMoney(-1500, "USD")).toBe("-15.00 USD");
    expect(visiblePreviewLines(preview({ credit: null, dueNow: null, nextRecurringAmount: null, nextBilledAt: null }))).toEqual(
      []
    );
    const lines = visiblePreviewLines(preview({ credit: null }));
    expect(lines.map((line) => line.label)).toEqual(["Due now", "Next renewal", "New recurring amount"]);
    expect(lines[0]?.ariaLabel).toBe("Due now 84.00 USD");
  });

  it("disables confirm until a successful immediate preview exists", () => {
    expect(canConfirmImmediatePreview(null, null)).toBe(false);
    expect(canConfirmImmediatePreview(preview({ providerPreviewAvailable: false }), null)).toBe(false);
    expect(canConfirmImmediatePreview(preview(), PREVIEW_FAILURE_COPY)).toBe(false);
    expect(canConfirmImmediatePreview(preview(), null)).toBe(true);
    expect(PREVIEW_FAILURE_COPY).toMatch(/try again before confirming/i);
    expect(STALE_PREVIEW_COPY).toMatch(/billing state changed/i);
  });

  it("hides fabricated success amounts", () => {
    expect(
      successShowsAmount({
        successMessage: "Yearly billing is active.",
        redirectUrl: "/settings/billing",
        completedInApp: true,
        amountCharged: null,
        currency: null,
        transactionId: null,
        invoiceReference: null,
        nextBilledAt: null,
      })
    ).toBe(false);
  });

  it("keeps the review dialog scrollable on a 390-wide viewport", () => {
    expect(REVIEW_DIALOG_CLASS_NAME).toMatch(/max-h-\[min\(90dvh,40rem\)\]/);
    expect(REVIEW_DIALOG_CLASS_NAME).toMatch(/overflow-y-auto/);
    expect(REVIEW_DIALOG_CLASS_NAME).toMatch(/w-\[calc\(100vw-1\.5rem\)\]/);
    expect(REVIEW_DIALOG_CLASS_NAME).toMatch(/max-w-md/);
  });

  it("exposes screen-reader labels for currency values", () => {
    expect(providerMoneyAriaLabel("Credit", 1500, "USD")).toBe("Credit 15.00 USD");
  });
});
