import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ADMIN_ROUTE_ENTER_CLASS,
  ADMIN_ROUTE_ENTER_DURATION,
  adminRouteTransitionKey,
} from "@/lib/admin-route-motion";

const LAYOUT_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/layouts/dashboard-layout.tsx"),
  "utf8"
);
const TRANSITION_SOURCE = readFileSync(
  resolve(
    import.meta.dirname,
    "../components/motion/admin-route-transition.tsx"
  ),
  "utf8"
);
const GLOBALS_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../app/globals.css"),
  "utf8"
);
const FORM_STUDIO_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/activities/activity-form-tab.tsx"),
  "utf8"
);
const ACTIVITY_DETAIL_SOURCE = readFileSync(
  resolve(
    import.meta.dirname,
    "../components/activities/activity-detail-page-client.tsx"
  ),
  "utf8"
);

describe("adminRouteTransitionKey", () => {
  it("strips query and hash so Form Studio tabs do not remount", () => {
    expect(adminRouteTransitionKey("/activities/abc?tab=form#build")).toBe(
      "/activities/abc"
    );
    expect(adminRouteTransitionKey("/activities/abc?tab=preview")).toBe(
      adminRouteTransitionKey("/activities/abc?tab=form")
    );
  });

  it("treats different activity ids as different routes", () => {
    expect(adminRouteTransitionKey("/activities/aaa")).not.toBe(
      adminRouteTransitionKey("/activities/bbb")
    );
  });

  it("normalizes empty input to root", () => {
    expect(adminRouteTransitionKey("")).toBe("/");
    expect(adminRouteTransitionKey("   ")).toBe("/");
  });
});

describe("admin route motion integration", () => {
  it("keeps the enter class name aligned with CSS", () => {
    expect(ADMIN_ROUTE_ENTER_CLASS).toBe("animate-page-enter");
    expect(ADMIN_ROUTE_ENTER_DURATION).toBe("0.28s");
    expect(GLOBALS_SOURCE).toContain(".animate-page-enter");
    expect(GLOBALS_SOURCE).toContain("page-enter 0.28s ease-out");
    expect(GLOBALS_SOURCE).toMatch(
      /prefers-reduced-motion:\s*reduce[\s\S]*\.animate-page-enter/
    );
  });

  it("keys the shell transition on the helper, not on main pathname", () => {
    expect(LAYOUT_SOURCE).toContain("adminRouteTransitionKey");
    expect(LAYOUT_SOURCE).toContain("AdminRouteTransition");
    expect(LAYOUT_SOURCE).not.toMatch(/<main[\s\S]*key=\{pathname\}/);
    expect(TRANSITION_SOURCE).toContain("ADMIN_ROUTE_ENTER_CLASS");
    expect(TRANSITION_SOURCE).not.toContain("dangerouslySetInnerHTML");
    expect(TRANSITION_SOURCE).not.toContain("startViewTransition");
    expect(LAYOUT_SOURCE).not.toContain("dangerouslySetInnerHTML");
  });

  it("does not wrap Form Studio mode or activity tabs in the route primitive", () => {
    expect(FORM_STUDIO_SOURCE).toContain('useState<FormStudioMode>("build")');
    expect(FORM_STUDIO_SOURCE).not.toContain("AdminRouteTransition");
    expect(ACTIVITY_DETAIL_SOURCE).toContain("setActiveTab(tab.id)");
    expect(ACTIVITY_DETAIL_SOURCE).not.toContain("AdminRouteTransition");
  });
});
