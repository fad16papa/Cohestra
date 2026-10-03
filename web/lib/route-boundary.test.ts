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

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { RouteBoundaryState } from "@/components/shared/route-boundary-state";
import { RouteErrorScreen } from "@/components/shared/route-error-screen";
import {
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
