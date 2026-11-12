import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

function source(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("Story E studio chrome", () => {
  it("website builder PageHeader uses room variant", () => {
    const builderPage = source("components/website/website-builder-page.tsx");
    const pageHeaderMatches = builderPage.match(/<PageHeader[\s\S]*?\/>/g) ?? [];

    expect(pageHeaderMatches.length).toBeGreaterThan(0);
    for (const snippet of pageHeaderMatches) {
      expect(snippet).toContain('variant="room"');
    }
    expect(builderPage).not.toContain("text-display-sm");
  });

  it("website studio keeps Core upgrade gate", () => {
    const builderPage = source("components/website/website-builder-page.tsx");

    expect(builderPage).toContain('requiredPlan="Core"');
  });

  it("website toolbar chrome frame uses 16px radius without decorative shadow", () => {
    const toolbar = source("components/website/website-builder-toolbar.tsx");

    expect(toolbar).toContain("rounded-[16px]");
    expect(toolbar).not.toMatch(
      /<header className="[^"]*shadow-sm/
    );
  });

  it("form studio keeps mode tablist and schema persistence", () => {
    const formTab = source("components/activities/activity-form-tab.tsx");

    expect(formTab).toContain('role="tablist"');
    expect(formTab).toContain('aria-label="Form studio modes"');
    expect(formTab).toContain("saveActivityFormSchema");
    expect(formTab).not.toContain("text-display-sm");
  });
});
