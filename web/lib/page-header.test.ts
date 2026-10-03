/** @vitest-environment jsdom */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { createElement, act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({
    profile: { email: "operator@cohestra.local" },
  }),
}));

import { PageHeader } from "@/components/shared/page-header";
import { DashboardGreetingHeader } from "@/components/dashboard/dashboard-greeting-header";
import { WEBSITE_STUDIO_TITLE } from "@/lib/admin-canonical-routes";

describe("PageHeader", () => {
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

  it("owns exactly one h1 and never a main landmark", async () => {
    await act(async () => {
      root.render(
        createElement(PageHeader, {
          title: "Clients",
          description: "One row per contact.",
          actions: createElement("a", { href: "/export" }, "Export CSV"),
        })
      );
    });

    expect(rootEl.querySelectorAll("h1")).toHaveLength(1);
    expect(rootEl.querySelector("h1")?.textContent).toBe("Clients");
    expect(rootEl.querySelectorAll("h2")).toHaveLength(0);
    expect(rootEl.querySelector("main")).toBeNull();
    expect(rootEl.querySelector("header")).not.toBeNull();
    expect(rootEl.querySelector("header")?.className).toMatch(/md:flex-row/);
    const actionWrap = rootEl.querySelector("header > div:last-child");
    expect(actionWrap?.className).toMatch(/min-h-11/);
  });

  it("keeps Dashboard as the only heading and greeting as a paragraph", async () => {
    await act(async () => {
      root.render(createElement(DashboardGreetingHeader));
    });

    expect(rootEl.querySelectorAll("h1")).toHaveLength(1);
    expect(rootEl.querySelector("h1")?.textContent).toBe("Dashboard");
    expect(rootEl.querySelectorAll("h2")).toHaveLength(0);
    expect(rootEl.textContent).toMatch(/Good (morning|afternoon|evening)/);
    expect(rootEl.querySelector("h1")?.closest("p")).toBeNull();
  });

  it("uses the Website Studio title constant", () => {
    expect(WEBSITE_STUDIO_TITLE).toBe("Website Studio");
  });
});
