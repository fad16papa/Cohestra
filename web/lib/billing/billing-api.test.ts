import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import {
  BILLING_RECONCILE_REASONS,
  reconcileBillingFromProviderWithAuth,
  shouldRequestBillingProviderSync,
} from "@/lib/billing/billing-api";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

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

describe("billing-sync trigger ownership", () => {
  it("keeps checkout-return reconcile on the admin layout only", () => {
    const settings = readFileSync(
      join(webRoot, "components/settings/settings-billing-page-content.tsx"),
      "utf8"
    );
    const layout = readFileSync(
      join(webRoot, "components/layouts/dashboard-layout.tsx"),
      "utf8"
    );
    const shell = readFileSync(
      join(webRoot, "components/shell/tenant-shell-provider.tsx"),
      "utf8"
    );

    expect(settings).not.toContain("reconcileBillingFromProvider");
    expect(settings).not.toContain("billing/sync");
    expect(layout).toContain("BILLING_RECONCILE_REASONS.checkoutReturn");
    expect(shell).not.toContain("billing/sync");
  });
});
