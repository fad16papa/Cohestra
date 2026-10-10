import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const LAYOUT = readFileSync(
  resolve(import.meta.dirname, "../app/(platform)/layout.tsx"),
  "utf8"
);
const HEADER = readFileSync(
  resolve(import.meta.dirname, "../components/platform/platform-header.tsx"),
  "utf8"
);
const DIRECTORY = readFileSync(
  resolve(import.meta.dirname, "../app/(platform)/platform/page.tsx"),
  "utf8"
);
const TENANT = readFileSync(
  resolve(import.meta.dirname, "../app/(platform)/platform/tenants/[id]/page.tsx"),
  "utf8"
);
const SUPPORT = readFileSync(
  resolve(import.meta.dirname, "../app/(platform)/platform/support/page.tsx"),
  "utf8"
);
const OPS = readFileSync(
  resolve(import.meta.dirname, "../components/platform/platform-tenant-ops-panel.tsx"),
  "utf8"
);
const OVERVIEW = readFileSync(
  resolve(import.meta.dirname, "../app/(platform)/platform/overview/page.tsx"),
  "utf8"
);
const GLOBALS = readFileSync(resolve(import.meta.dirname, "../app/globals.css"), "utf8");

describe("Story 43.4 Platform source contract", () => {
  it("aliases shared plat tokens and keeps Platform-only gold wash", () => {
    expect(LAYOUT).toContain('"--plat-stone": "var(--text-muted)"');
    expect(LAYOUT).toContain('"--plat-ink": "var(--ink)"');
    expect(LAYOUT).toContain('"--plat-paper": "var(--paper)"');
    expect(LAYOUT).toContain('"--plat-header-muted"');
    expect(LAYOUT).toContain("var(--plat-gold-soft)");
    expect(LAYOUT).not.toMatch(/--plat-stone":\s*"#8B939C"/);
    expect(LAYOUT).not.toContain("AdminRouteTransition");
    expect(LAYOUT).not.toContain("AdminSidebar");
  });

  it("inherits the 38.5 skip contract on a single main", () => {
    expect(LAYOUT).toContain("AdminSkipLink");
    expect(LAYOUT).toContain("MAIN_CONTENT_ID");
    expect(LAYOUT).toMatch(/<main[\s\S]*id=\{MAIN_CONTENT_ID\}/);
    expect(LAYOUT.match(/<main/g)?.length).toBe(1);
    expect(LAYOUT).toContain("tabIndex={-1}");
  });

  it("marks current Platform nav and meets the 44px menu floor", () => {
    expect(HEADER).toContain('aria-current={current ? "page" : undefined}');
    expect(HEADER).toContain("min-h-11 min-w-11");
    expect(HEADER).not.toContain("size-10");
    expect(HEADER).toContain("plat-header-muted");
    expect(HEADER.indexOf('label: "Overview"')).toBeLessThan(HEADER.indexOf('label: "Tenants"'));
    expect(HEADER.indexOf('label: "Tenants"')).toBeLessThan(HEADER.indexOf('label: "Operations"'));
    expect(HEADER.indexOf('label: "Operations"')).toBeLessThan(HEADER.indexOf('label: "Support"'));
    expect(HEADER.indexOf('label: "Support"')).toBeLessThan(HEADER.indexOf('label: "Audits"'));
    expect(HEADER).toContain('href === "/platform/overview"');
    expect(HEADER).toContain('href === "/platform/ops"');
  });

  it("replaces window.confirm with AlertDialog on Archive and recovery", () => {
    expect(TENANT).toContain("<AlertDialog");
    expect(TENANT).toContain("Archive workspace");
    expect(TENANT).not.toContain("window.confirm");
    expect(OPS).toContain("<AlertDialog");
    expect(OPS).not.toContain("window.confirm");
  });

  it("exposes Suspended vs OnHold language and OnHold filter", () => {
    expect(DIRECTORY).toContain("OnHold");
    expect(DIRECTORY).toContain("describePlatformTenantStatus");
    expect(DIRECTORY).toContain("describePlatformBillingStatus");
    expect(TENANT).toContain("describePlatformTenantStatus");
    expect(TENANT).toContain("describePlatformBillingStatus");
    expect(TENANT).toMatch(/not for non-payment/);
  });

  it("keeps pagination at the 44px floor and a platform focus ring", () => {
    expect(DIRECTORY).toContain("min-h-11");
    expect(DIRECTORY).not.toContain("min-h-10");
    expect(SUPPORT).not.toContain("min-h-10");
    expect(OPS).toContain("min-h-11");
    expect(GLOBALS).toContain(".platform-console");
    expect(GLOBALS).toContain(":focus-visible");
  });

  it("does not add impersonation or tenant Admin route motion", () => {
    expect(LAYOUT + HEADER + DIRECTORY + TENANT + OVERVIEW).not.toMatch(/impersonat/i);
    expect(LAYOUT + HEADER + OVERVIEW).not.toContain("AdminRouteTransition");
    expect(OVERVIEW).not.toContain("PlanBadge");
    expect(OVERVIEW).not.toContain("/follow-up");
    expect(OVERVIEW).toContain("Loading overview");
    expect(OVERVIEW).toContain('role="status"');
    expect(OVERVIEW).toContain('role="alert"');
    expect(OVERVIEW).toContain("No tenants in this view");
    expect(OVERVIEW).toContain("No open support issues");
    expect(OVERVIEW).toContain("Could not load overview");
    expect(OVERVIEW).toContain("setOverview(null)");
    expect(OVERVIEW).toContain("break-words");
    expect(OVERVIEW).toContain("stackHealthSummary");
    expect(OVERVIEW).toContain("not outbox, Paddle, or email");
    expect(OVERVIEW).not.toContain("/ready");
  });
});
