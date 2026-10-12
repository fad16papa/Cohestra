import { describe, expect, it, vi } from "vitest";

import {
  BILLING_RECONCILE_REASONS,
  checkoutReconcileKey,
  confirmPlanChangeWithAuth,
  createBillingCheckoutWithAuth,
  createBillingPortalSession,
  createCheckoutReconcileGate,
  previewPlanChangeWithAuth,
  reconcileBillingFromProviderWithAuth,
  resolveCheckoutReturnTrigger,
  shouldRequestBillingProviderSync,
} from "@/lib/billing/billing-api";

function summaryPayload(configured: boolean, plan = "Pro") {
  return {
    plan,
    billingStatus: "Free",
    billingConfigured: configured,
    trialPeriodDays: 30,
    isComplimentary: false,
    hasConsumedTrial: false,
  };
}

describe("shouldRequestBillingProviderSync", () => {
  it("never syncs when Paddle is unconfigured", () => {
    expect(
      shouldRequestBillingProviderSync({
        billingConfigured: false,
        reason: BILLING_RECONCILE_REASONS.checkoutReturn,
      })
    ).toBe(false);
    expect(
      shouldRequestBillingProviderSync({
        billingConfigured: false,
        reason: BILLING_RECONCILE_REASONS.explicitRefresh,
      })
    ).toBe(false);
  });

  it("never syncs for ordinary navigation / missing reason", () => {
    expect(
      shouldRequestBillingProviderSync({
        billingConfigured: true,
        reason: null,
      })
    ).toBe(false);
  });

  it("syncs only for checkout return or explicit refresh when configured", () => {
    expect(
      shouldRequestBillingProviderSync({
        billingConfigured: true,
        reason: BILLING_RECONCILE_REASONS.checkoutReturn,
      })
    ).toBe(true);
    expect(
      shouldRequestBillingProviderSync({
        billingConfigured: true,
        reason: BILLING_RECONCILE_REASONS.explicitRefresh,
      })
    ).toBe(true);
  });
});

describe("reconcileBillingFromProviderWithAuth", () => {
  it("GETs summary and skips POST when unconfigured", async () => {
    const authFetch = vi.fn(async (url: string, init?: RequestInit) => {
      expect(String(url)).toContain("/api/v1/admin/billing");
      expect(init?.method ?? "GET").toBe("GET");
      return new Response(JSON.stringify(summaryPayload(false)), { status: 200 });
    });

    const result = await reconcileBillingFromProviderWithAuth(authFetch, {
      reason: BILLING_RECONCILE_REASONS.explicitRefresh,
    });

    expect(result.synced).toBe(false);
    expect(result.summary.billingConfigured).toBe(false);
    expect(authFetch).toHaveBeenCalledTimes(1);
  });

  it("POSTs sync after GET when configured and reason is checkout-return", async () => {
    const authFetch = vi.fn(async (url: string, init?: RequestInit) => {
      if ((init?.method ?? "GET") === "POST") {
        expect(String(url)).toContain("/api/v1/admin/billing/sync");
        return new Response(JSON.stringify(summaryPayload(true, "Pro")), { status: 200 });
      }

      expect(String(url)).toMatch(/\/api\/v1\/admin\/billing$/);
      return new Response(JSON.stringify(summaryPayload(true, "Basic")), { status: 200 });
    });

    const result = await reconcileBillingFromProviderWithAuth(authFetch, {
      reason: BILLING_RECONCILE_REASONS.checkoutReturn,
      checkoutSessionId: "txn_1",
    });

    expect(result.synced).toBe(true);
    expect(result.summary.plan).toBe("Pro");
    expect(authFetch).toHaveBeenCalledTimes(2);
    const syncCall = authFetch.mock.calls[1];
    expect(syncCall[1]?.method).toBe("POST");
    expect(syncCall[1]?.body).toBe(JSON.stringify({ checkoutSessionId: "txn_1" }));
  });

  it("does not POST when configured but the caller has no reconcile reason", async () => {
    const authFetch = vi.fn(async () =>
      new Response(JSON.stringify(summaryPayload(true)), { status: 200 })
    );

    const skipped = shouldRequestBillingProviderSync({
      billingConfigured: true,
      reason: null,
    });
    expect(skipped).toBe(false);
    expect(authFetch).not.toHaveBeenCalled();
  });

  it("surfaces provider sync failures instead of swallowing them", async () => {
    const authFetch = vi.fn(async (url: string, init?: RequestInit) => {
      if ((init?.method ?? "GET") === "POST") {
        return new Response(
          JSON.stringify({ title: "Billing unavailable", detail: "Paddle is not configured in this environment." }),
          { status: 503 }
        );
      }

      return new Response(JSON.stringify(summaryPayload(true)), { status: 200 });
    });

    await expect(
      reconcileBillingFromProviderWithAuth(authFetch, {
        reason: BILLING_RECONCILE_REASONS.explicitRefresh,
      })
    ).rejects.toThrow("Paddle is not configured in this environment.");
  });
});

describe("resolveCheckoutReturnTrigger", () => {
  it("does not treat ordinary navigation or dashboard view queries as checkout return", () => {
    expect(
      resolveCheckoutReturnTrigger({
        billing: null,
        sessionId: null,
        ptxn: null,
        transactionId: null,
      }).shouldReconcile
    ).toBe(false);
    expect(
      resolveCheckoutReturnTrigger({
        billing: null,
        sessionId: "view-session",
        ptxn: null,
        transactionId: null,
      }).shouldReconcile
    ).toBe(false);
    expect(
      resolveCheckoutReturnTrigger({
        billing: "incomplete",
        sessionId: "txn_1",
        ptxn: null,
        transactionId: null,
      }).shouldReconcile
    ).toBe(false);
  });

  it("accepts a validated checkout-return", () => {
    expect(
      resolveCheckoutReturnTrigger({
        billing: "success",
        sessionId: "txn_1",
        ptxn: null,
        transactionId: null,
      })
    ).toEqual({ shouldReconcile: true, checkoutSessionId: "txn_1" });
    expect(
      resolveCheckoutReturnTrigger({
        billing: null,
        sessionId: null,
        ptxn: "txn_ptxn",
        transactionId: null,
      }).shouldReconcile
    ).toBe(true);
  });
});

describe("createBillingPortalSession", () => {
  it("posts the browser return URL unchanged", async () => {
    const returnUrl = "https://creativorare.uat.cohestra.app/settings/billing";
    const authFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toEqual({ returnUrl });
      return new Response(JSON.stringify({ portalUrl: "https://sandbox-customer-portal.paddle.com/s" }), {
        status: 200,
      });
    });

    await expect(createBillingPortalSession(authFetch, returnUrl)).resolves.toBe(
      "https://sandbox-customer-portal.paddle.com/s"
    );
  });
});

describe("previewPlanChangeWithAuth", () => {
  it("posts only plan and interval", async () => {
    const authFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual({
        plan: "pro",
        interval: "annual",
      });
      return new Response(
        JSON.stringify({
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
        }),
        { status: 200 }
      );
    });

    await expect(
      previewPlanChangeWithAuth(authFetch, { plan: "pro", interval: "annual" })
    ).resolves.toMatchObject({
      ok: true,
      result: {
        credit: { amountMinor: 1500, currency: "USD" },
        confirmLabel: "Confirm yearly billing",
      },
    });
  });

  it("does not invent money when optional provider fields are missing", async () => {
    const authFetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          currentPlan: "Pro",
          currentInterval: "Monthly",
          targetPlan: "Pro",
          targetInterval: "Annual",
          providerPreviewAvailable: true,
          deferred: false,
          previewState: "abc",
          reviewCopy: "Yearly billing starts now.",
          confirmLabel: "Confirm yearly billing",
        }),
        { status: 200 }
      )
    );

    const result = await previewPlanChangeWithAuth(authFetch, { plan: "pro", interval: "annual" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.credit).toBeNull();
      expect(result.result.dueNow).toBeNull();
      expect(result.result.nextRecurringAmount).toBeNull();
    }
  });
});

describe("confirmPlanChangeWithAuth", () => {
  it("maps a stale-preview conflict", async () => {
    const authFetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          title: "Billing state changed",
          detail:
            "Your billing state changed while you were reviewing this change. Review the updated billing details and try again.",
        }),
        { status: 409 }
      )
    );

    await expect(
      confirmPlanChangeWithAuth(authFetch, {
        plan: "pro",
        interval: "annual",
        previewState: "stale",
      })
    ).resolves.toMatchObject({ ok: false, conflict: true });
  });
});

describe("createBillingCheckoutWithAuth", () => {
  it("posts workspace success and cancel URLs unchanged", async () => {
    const successUrl = "https://creativorare.uat.cohestra.app/dashboard?billing=success";
    const cancelUrl = "https://creativorare.uat.cohestra.app/billing/checkout?canceled=1";
    const authFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual({
        plan: "pro",
        interval: "monthly",
        successUrl,
        cancelUrl,
      });
      return new Response(
        JSON.stringify({
          checkoutUrl: "https://sandbox-buy.paddle.com/c",
          trialDisclaimer: "Trial",
        }),
        { status: 200 }
      );
    });

    await expect(
      createBillingCheckoutWithAuth(authFetch, {
        plan: "pro",
        interval: "monthly",
        successUrl,
        cancelUrl,
      })
    ).resolves.toMatchObject({ ok: true });
  });
});

describe("createCheckoutReconcileGate", () => {
  it("reuses one in-flight attempt per tenant and return key", async () => {
    const gate = createCheckoutReconcileGate();
    const start = vi.fn(async () => ({ synced: true }));
    const key = checkoutReconcileKey("studio", "txn_1");

    const first = gate.run(key, start);
    const second = gate.run(key, start);
    await expect(Promise.all([first, second])).resolves.toEqual([
      { synced: true },
      { synced: true },
    ]);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("does not share a checkout attempt across tenants", async () => {
    const gate = createCheckoutReconcileGate();
    const startA = vi.fn(async () => ({ synced: true }));
    const startB = vi.fn(async () => ({ synced: true }));

    await gate.run(checkoutReconcileKey("tenant-a", "txn_1"), startA);
    await gate.run(checkoutReconcileKey("tenant-b", "txn_1"), startB);

    expect(startA).toHaveBeenCalledTimes(1);
    expect(startB).toHaveBeenCalledTimes(1);
  });

  it("allows an intentional retry after a real failure", async () => {
    const gate = createCheckoutReconcileGate();
    const start = vi
      .fn()
      .mockRejectedValueOnce(new Error("provider failed"))
      .mockResolvedValueOnce({ synced: true });
    const key = checkoutReconcileKey("studio", "txn_1");

    await expect(gate.run(key, start)).rejects.toThrow("provider failed");
    await expect(gate.run(key, start)).resolves.toEqual({ synced: true });
    expect(start).toHaveBeenCalledTimes(2);
  });
});
