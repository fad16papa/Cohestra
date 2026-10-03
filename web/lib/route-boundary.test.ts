/** @vitest-environment jsdom */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { createElement, act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => createElement("a", { href, className }, children),
}));

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

function findUnmatchedPages(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }

  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (entry === "[...unmatched]" && existsSync(resolve(full, "page.tsx"))) {
      found.push(full);
    }
    if (statSync(full).isDirectory()) {
      found.push(...findUnmatchedPages(full));
    }
  }
  return found;
}

import { RouteBoundaryState } from "@/components/shared/route-boundary-state";
import { RouteErrorScreen } from "@/components/shared/route-error-screen";
import {
  ADMIN_PATH_PREFIXES,
  E2E_FORCE_ERROR_MESSAGE,
  ROUTE_ERROR_COPY,
  ROUTE_ERROR_H1,
  ROUTE_NOT_FOUND_H1,
  ROUTE_OFFLINE_COPY,
  ROUTE_OFFLINE_H1,
  isForceErrorBlocked,
  routeBoundaryCopy,
  routeBoundaryHeading,
  routeBoundaryOwnsMain,
  routeBoundaryRecovery,
  routeBoundarySurfaceFromPath,
  shouldAutoResetOnReconnect,
} from "@/lib/route-boundary";

describe("route boundary copy", () => {
  it("locks exact headings", () => {
    expect(routeBoundaryHeading("not-found")).toBe(ROUTE_NOT_FOUND_H1);
    expect(routeBoundaryHeading("error")).toBe(ROUTE_ERROR_H1);
    expect(routeBoundaryHeading("offline")).toBe(ROUTE_OFFLINE_H1);
    expect(ROUTE_NOT_FOUND_H1).toBe("Page not found");
    expect(ROUTE_ERROR_H1).toBe("This screen failed");
  });

  it("uses approved supporting copy", () => {
    expect(routeBoundaryCopy("not-found", "admin")).toContain("workspace");
    expect(routeBoundaryCopy("not-found", "marketing")).toContain("Cohestra");
    expect(routeBoundaryCopy("not-found", "platform")).toContain("platform console");
    expect(routeBoundaryCopy("error", "admin")).toBe(ROUTE_ERROR_COPY);
    expect(routeBoundaryCopy("offline", "marketing")).toBe(ROUTE_OFFLINE_COPY);
  });

  it("resolves recovery destinations by surface", () => {
    expect(routeBoundaryRecovery("admin")).toEqual({ href: "/dashboard", label: "Dashboard" });
    expect(routeBoundaryRecovery("marketing")).toEqual({ href: "/", label: "Home" });
    expect(routeBoundaryRecovery("platform")).toEqual({
      href: "/platform",
      label: "Platform home",
    });
    expect(routeBoundaryRecovery("public").href).toBe("/");
    expect(routeBoundaryRecovery("embed").href).toBe("/");
    expect(routeBoundaryOwnsMain("admin")).toBe(false);
    expect(routeBoundaryOwnsMain("platform")).toBe(false);
    expect(routeBoundaryOwnsMain("public")).toBe(false);
    expect(routeBoundaryOwnsMain("marketing")).toBe(true);
    expect(routeBoundaryOwnsMain("embed")).toBe(true);
    expect(routeBoundarySurfaceFromPath("/dashboard/nope")).toBe("admin");
    expect(routeBoundarySurfaceFromPath("/platform/nope")).toBe("platform");
    expect(routeBoundarySurfaceFromPath("/nope-px2-39-5")).toBe("marketing");
    expect(routeBoundarySurfaceFromPath("/embed/missing")).toBe("embed");
  });

  it("blocks the force-error harness in production only", () => {
    expect(isForceErrorBlocked("production")).toBe(true);
    expect(isForceErrorBlocked("development")).toBe(false);
    expect(isForceErrorBlocked("test")).toBe(false);
  });

  it("auto-resets only on the first offline-to-online transition", () => {
    expect(
      shouldAutoResetOnReconnect({ wasOnline: true, isOnline: true, hasAutoReset: false })
    ).toBe(false);
    expect(
      shouldAutoResetOnReconnect({ wasOnline: false, isOnline: false, hasAutoReset: false })
    ).toBe(false);
    expect(
      shouldAutoResetOnReconnect({ wasOnline: false, isOnline: true, hasAutoReset: false })
    ).toBe(true);
    expect(
      shouldAutoResetOnReconnect({ wasOnline: false, isOnline: true, hasAutoReset: true })
    ).toBe(false);
    expect(
      shouldAutoResetOnReconnect({ wasOnline: true, isOnline: false, hasAutoReset: false })
    ).toBe(false);
  });

  it("covers every admin prefix with a nested unmatched catch-all", () => {
    const adminRoot = resolve(__dirname, "../app/(admin)");
    const entityPages = [
      resolve(adminRoot, "clients/[id]/page.tsx"),
      resolve(adminRoot, "activities/[id]/page.tsx"),
      resolve(adminRoot, "activities/communities/[id]/page.tsx"),
      resolve(adminRoot, "campaigns/[id]/page.tsx"),
      resolve(adminRoot, "billing/checkout/page.tsx"),
      resolve(adminRoot, "reports/page.tsx"),
    ];
    for (const entityPage of entityPages) {
      expect(existsSync(entityPage), entityPage).toBe(true);
    }

    for (const prefix of ADMIN_PATH_PREFIXES) {
      const folder = resolve(adminRoot, prefix.slice(1));
      expect(findUnmatchedPages(folder), `${prefix} catch-all`).not.toHaveLength(0);
    }
  });
});

describe("RouteBoundaryState", () => {
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

  it("owns one h1, optional main, and focuses the heading", async () => {
    await act(async () => {
      root.render(
        createElement(RouteBoundaryState, {
          kind: "not-found",
          surface: "marketing",
          ownsMain: true,
        })
      );
    });

    expect(rootEl.querySelectorAll("h1")).toHaveLength(1);
    expect(rootEl.querySelector("h1")?.textContent).toBe("Page not found");
    expect(rootEl.querySelectorAll("main")).toHaveLength(1);
    expect(rootEl.querySelector("a")?.getAttribute("href")).toBe("/");
    expect(rootEl.querySelector("a")?.className).toMatch(/min-h-12/);
    expect(document.activeElement).toBe(rootEl.querySelector("h1"));
  });

  it("does not render main on admin and uses Dashboard recovery", async () => {
    await act(async () => {
      root.render(
        createElement(RouteBoundaryState, {
          kind: "not-found",
          surface: "admin",
        })
      );
    });

    expect(rootEl.querySelector("main")).toBeNull();
    expect(rootEl.querySelector("a")?.getAttribute("href")).toBe("/dashboard");
    expect(rootEl.querySelector("a")?.textContent).toBe("Dashboard");
    expect(rootEl.querySelector("a")?.className).toMatch(/min-h-11/);
  });

  it("never prints exception text", async () => {
    const reset = vi.fn();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await act(async () => {
      root.render(
        createElement(RouteErrorScreen, {
          surface: "admin",
          ownsMain: false,
          error: Object.assign(new Error("secret-stack-token-tenant"), { digest: "abc123" }),
          reset,
        })
      );
    });

    expect(rootEl.textContent).toContain("This screen failed");
    expect(rootEl.textContent).not.toContain("secret-stack-token-tenant");
    expect(rootEl.textContent).not.toContain("abc123");
    expect(rootEl.textContent).not.toContain(E2E_FORCE_ERROR_MESSAGE);
    expect(errorSpy).toHaveBeenCalledWith("route-boundary", "abc123");
    errorSpy.mockRestore();
  });
});

describe("RouteErrorScreen connectivity reset", () => {
  let rootEl: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  function setNavigatorOnline(value: boolean): void {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => value,
    });
  }

  beforeEach(() => {
    rootEl = document.createElement("div");
    document.body.append(rootEl);
    root = createRoot(rootEl);
    setNavigatorOnline(true);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    rootEl.remove();
  });

  async function renderScreen(reset: () => void): Promise<void> {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await act(async () => {
      root.render(
        createElement(RouteErrorScreen, {
          surface: "admin",
          ownsMain: false,
          error: Object.assign(new Error("secret-stack-token-tenant"), { digest: "abc123" }),
          reset,
        })
      );
    });
    errorSpy.mockRestore();
  }

  it("does not reset on an initially online mount", async () => {
    const reset = vi.fn();
    await renderScreen(reset);
    expect(rootEl.querySelector("h1")?.textContent).toBe("This screen failed");
    expect(reset).not.toHaveBeenCalled();
  });

  it("renders approved offline heading and copy after an offline event", async () => {
    const reset = vi.fn();
    await renderScreen(reset);
    await act(async () => {
      setNavigatorOnline(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(rootEl.querySelector("h1")?.textContent).toBe(ROUTE_OFFLINE_H1);
    expect(rootEl.textContent).toContain(ROUTE_OFFLINE_COPY);
    expect(rootEl.textContent).not.toContain("secret-stack-token-tenant");
    expect([...rootEl.querySelectorAll("button")].some((el) => el.textContent === "Try again")).toBe(
      true
    );
    expect(reset).not.toHaveBeenCalled();
  });

  it("calls reset exactly once on the first offline-to-online transition", async () => {
    const reset = vi.fn();
    await renderScreen(reset);
    await act(async () => {
      setNavigatorOnline(false);
      window.dispatchEvent(new Event("offline"));
    });
    await act(async () => {
      setNavigatorOnline(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(reset).toHaveBeenCalledTimes(1);
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });
    expect(reset).toHaveBeenCalledTimes(1);
  });
});

describe("E2eForceErrorPage", () => {
  it("guards the thrower with production notFound", () => {
    const source = readFileSync(
      resolve(__dirname, "../components/e2e/e2e-force-error-page.tsx"),
      "utf8"
    );
    expect(source).toContain("isForceErrorBlocked");
    expect(source).toContain("notFound()");
    expect(isForceErrorBlocked("production")).toBe(true);
  });
});
