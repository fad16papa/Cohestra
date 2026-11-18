import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

function source(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

const PLATFORM_ROOM_PAGES = [
  "app/(platform)/platform/overview/page.tsx",
  "app/(platform)/platform/audits/page.tsx",
  "app/(platform)/platform/ops/page.tsx",
  "app/(platform)/platform/support/page.tsx",
  "app/(platform)/platform/tenants/[id]/page.tsx",
] as const;

const CALM_H1 =
  "text-[1.25rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--plat-ink)]";

describe("Story G platform admin density", () => {
  it("platform room pages drop display serif and use calm h1 density", () => {
    for (const pagePath of PLATFORM_ROOM_PAGES) {
      const pageSource = source(pagePath);
      expect(pageSource).not.toContain("--font-plat-display");
      expect(pageSource).toContain("text-[1.25rem]");
      expect(pageSource).toContain(CALM_H1);
    }
  });

  it("overview, audits, and ops use calm Platform eyebrow", () => {
    const eyebrow =
      'text-xs font-semibold tracking-[0.04em] text-[var(--plat-stone)]';
    for (const pagePath of [
      "app/(platform)/platform/overview/page.tsx",
      "app/(platform)/platform/audits/page.tsx",
      "app/(platform)/platform/ops/page.tsx",
    ] as const) {
      const pageSource = source(pagePath);
      expect(pageSource).toContain(eyebrow);
      expect(pageSource).not.toContain("tracking-[0.18em]");
    }
  });

  it("platform-tenant-ops-panel keeps recovery ops without impersonation", () => {
    const panel = source("components/platform/platform-tenant-ops-panel.tsx");
    expect(panel.toLowerCase()).not.toContain("impersonat");
    expect(panel).toContain("Send password reset");
  });

  it("outer platform cards use 16px frame radius", () => {
    expect(source("components/platform/platform-card.tsx")).toContain("rounded-[16px]");
    expect(source("components/platform/platform-kpi-tile.tsx")).toContain("rounded-[16px]");
  });
});
