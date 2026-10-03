/** @vitest-environment jsdom */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { createElement, act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({
    authFetch: vi.fn(),
    profile: { email: "owner@cohestra.local" },
  }),
}));

import { InAppBillingPanel } from "@/components/billing/in-app-billing-panel";

describe("InAppBillingPanel unrecognized plan", () => {
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
});
