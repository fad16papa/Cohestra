/** @vitest-environment jsdom */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { createElement, act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const authFetch = vi.hoisted(() =>
  vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    if (method === "GET" && String(url).includes("/api/v1/admin/shell")) {
      return new Response(
        JSON.stringify({
          plan: "Pro",
          billingStatus: "Trialing",
          isTenantAdmin: true,
          isBillingOwner: true,
          tenantSlug: "default",
        }),
        { status: 200 }
      );
    }

    return new Response(JSON.stringify({ title: "Unexpected" }), { status: 500 });
  })
);

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({
    authFetch,
    status: "authenticated",
  }),
}));

import { TenantShellProvider } from "@/components/shell/tenant-shell-provider";

describe("TenantShellProvider billing-sync regression", () => {
  afterEach(() => {
    authFetch.mockClear();
    document.body.replaceChildren();
  });

  it("does not POST billing/sync on ordinary mount, focus, or visibility refresh", async () => {
    const rootEl = document.createElement("div");
    document.body.append(rootEl);
    const root = createRoot(rootEl);

    await act(async () => {
      root.render(createElement(TenantShellProvider, null, createElement("span", null, "child")));
    });
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
    });

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
    });

    const urls = authFetch.mock.calls.map(([url, init]) => ({
      url: String(url),
      method: init?.method ?? "GET",
    }));

    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((call) => call.url.includes("/api/v1/admin/shell"))).toBe(true);
    expect(urls.some((call) => call.url.includes("/billing/sync"))).toBe(false);
    expect(urls.some((call) => call.method === "POST")).toBe(false);

    await act(async () => {
      root.unmount();
    });
  });
});
