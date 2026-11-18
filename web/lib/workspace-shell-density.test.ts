import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

function source(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("workspace shell density", () => {
  it("keeps a 56px toolbar with the contract title or a breadcrumb trail", () => {
    const toolbar = source("components/layouts/admin-top-bar.tsx");

    expect(toolbar).toContain("flex h-14 shrink-0");
    expect(toolbar).toContain("text-[1.25rem] font-semibold leading-none tracking-[-0.02em]");
    expect(toolbar).toContain("breadcrumbs.length > 1");
    expect(toolbar).toContain('aria-label="Open command palette"');
    expect(toolbar).not.toContain("text-section");
  });

  it("insets the main panel at 16px below 768 and 24px from there", () => {
    const layout = source("components/layouts/dashboard-layout.tsx");

    expect(layout).toContain("p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]");
    expect(layout).toContain("md:p-6 md:pb-6");
    expect(layout).not.toContain("sm:p-6");
  });

  it("keeps the sidebar widths and palette row height", () => {
    const sidebar = source("components/layouts/admin-sidebar.tsx");
    const palette = source("components/layouts/admin-command-palette.tsx");

    expect(sidebar).toContain("w-16 lg:w-60");
    expect(palette).toContain("flex h-9 w-full items-center");
    expect(palette).toContain("text-[0.8125rem]");
  });
});
