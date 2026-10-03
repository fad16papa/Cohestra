/** @vitest-environment jsdom */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { createElement, act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TenantShell } from "@/lib/shell/tenant-shell-api";

const shellState = vi.hoisted(() => ({
  current: null as TenantShell | null,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/billing/in-app-billing-panel", () => ({
  InAppBillingPanel: () =>
    createElement(
      "div",
      { "data-testid": "in-app-billing-panel" },
      createElement("a", { href: "/billing/checkout?plan=pro" }, "Change plan")
    ),
}));

vi.mock("@/components/shell/tenant-shell-provider", () => ({
  useTenantShell: () => ({
    shell: shellState.current,
    refreshShell: async () => undefined,
  }),
}));

import { SettingsBillingPageContent } from "@/components/settings/settings-billing-page-content";

function shell(partial: Partial<TenantShell>): TenantShell {
  return {
    plan: "Pro",
    billingStatus: "Active",
    billingInterval: "month",
    trialEndsAt: null,
    isComplimentary: false,
    isTenantAdmin: true,
    isBillingOwner: true,
    billingOwnerEmail: "owner@cohestra.local",
    tenantSlug: "demo",
    tenantName: "Demo",
    registrationTimeZoneId: "UTC",
    registrationMonthResetsAt: null,
    limits: {
      seats: 10,
      communities: 10,
      publishedActivities: 10,
      registrationsPerMonth: 500,
    },
    usage: {
      seatsUsed: 1,
      communities: 1,
      publishedActivities: 1,
      registrationsThisMonth: 0,
    },
    limitDials: [],
    billingBanner: null,
    ...partial,
  };
}

describe("SettingsBillingPageContent owner gate", () => {
  let rootEl: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    rootEl = document.createElement("div");
    document.body.append(rootEl);
    root = createRoot(rootEl);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    rootEl.remove();
    shellState.current = null;
  });

  async function renderPage() {
    await act(async () => {
      root.render(createElement(SettingsBillingPageContent));
    });
  }

  it("shows owner-managed copy for an Enterprise admin who is not the billing owner", async () => {
    shellState.current = shell({
      plan: "Enterprise",
      isTenantAdmin: true,
      isBillingOwner: false,
      billingOwnerEmail: "owner@cohestra.local",
    });
    await renderPage();

    expect(rootEl.textContent).toMatch(/managed by/i);
    expect(rootEl.textContent).toContain("owner@cohestra.local");
    expect(rootEl.querySelector("[data-testid='in-app-billing-panel']")).toBeNull();
    expect(rootEl.querySelector("a[href*='/billing/checkout']")).toBeNull();
    expect(rootEl.textContent).not.toMatch(/change plan/i);
  });

  it("keeps authorized Enterprise billing content for the billing owner", async () => {
    shellState.current = shell({
      plan: "Enterprise",
      isTenantAdmin: true,
      isBillingOwner: true,
    });
    await renderPage();

    expect(rootEl.querySelector("[data-testid='in-app-billing-panel']")).not.toBeNull();
    expect(rootEl.textContent).not.toMatch(/managed by/i);
  });

  it("does not invent owner-managed billing for a missing or unknown plan", async () => {
    shellState.current = shell({
      plan: null,
      isTenantAdmin: true,
      isBillingOwner: false,
    });
    await renderPage();
    expect(rootEl.textContent).not.toMatch(/managed by/i);
    expect(rootEl.querySelector("[data-testid='in-app-billing-panel']")).not.toBeNull();

    shellState.current = shell({
      plan: "Platinum",
      isTenantAdmin: true,
      isBillingOwner: false,
    });
    await renderPage();
    expect(rootEl.textContent).not.toMatch(/managed by/i);
    expect(rootEl.querySelector("[data-testid='in-app-billing-panel']")).not.toBeNull();
  });

  it("preserves Basic content and Core/Pro owner-managed behavior", async () => {
    shellState.current = shell({
      plan: "Basic",
      isTenantAdmin: true,
      isBillingOwner: false,
    });
    await renderPage();
    expect(rootEl.querySelector("[data-testid='in-app-billing-panel']")).not.toBeNull();

    shellState.current = shell({
      plan: "Core",
      isTenantAdmin: true,
      isBillingOwner: false,
    });
    await renderPage();
    expect(rootEl.textContent).toMatch(/managed by/i);
    expect(rootEl.querySelector("[data-testid='in-app-billing-panel']")).toBeNull();

    shellState.current = shell({
      plan: "Pro",
      isTenantAdmin: true,
      isBillingOwner: true,
    });
    await renderPage();
    expect(rootEl.querySelector("[data-testid='in-app-billing-panel']")).not.toBeNull();
  });
});
