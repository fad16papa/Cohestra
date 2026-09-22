import { describe, expect, it, vi } from "vitest";

import {
  BILLING_RECONCILE_REASONS,
  checkoutReconcileKey,
  createCheckoutReconcileGate,
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
