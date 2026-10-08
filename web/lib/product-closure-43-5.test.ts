import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(relative: string): string {
  return readFileSync(resolve(import.meta.dirname, relative), "utf8");
}

describe("Story 43.5 product-closure source contracts", () => {
  it("register copy matches the current Team model", () => {
    const page = source("../app/register/page.tsx");
    expect(page).not.toMatch(/one operator/i);
    expect(page).not.toMatch(/single operator/i);
    expect(page).toContain("invite teammates later");
    expect(page).toContain("Create your workspace admin account");
  });

  it("public Suspended copy is paused, not on hold", () => {
    const page = source("../components/public/tenant-maintenance-page.tsx");
    expect(page).toContain("Workspace paused");
    expect(page).toContain("is paused");
    expect(page).not.toMatch(/on hold/i);
  });

  it("community leads header does not use an invalid role=row", () => {
    const page = source("../components/activities/community-detail-page.tsx");
    expect(page).not.toContain('role="row"');
  });

  it("does not add a marketing analytics tracker", () => {
    const cookie = source("../components/marketing/marketing-cookie-consent.tsx");
    expect(cookie).not.toMatch(/gtag|plausible|posthog|googletagmanager/i);
  });

  it("does not globally exclude disabled controls from Axe callers", () => {
    const e2eDir = resolve(import.meta.dirname, "../e2e");
    const files = [
      "a11y-38-4.spec.ts",
      "landmarks-38-5.spec.ts",
      "page-header-39-4.spec.ts",
      "overlays-38-6.spec.ts",
      "form-studio-42-2.spec.ts",
      "form-studio-42-3.spec.ts",
      "form-studio-42-4.spec.ts",
      "website-studio-42-1.spec.ts",
      "campaigns-41-3.spec.ts",
      "ai-41-2.spec.ts",
      "analytics-41-1.spec.ts",
    ];
    for (const file of files) {
      const text = readFileSync(resolve(e2eDir, file), "utf8");
      expect(text, file).toContain("analyzeAxe");
      expect(text, file).not.toMatch(/\.exclude\(\s*["']\[disabled\]["']\s*\)/);
      expect(text, file).not.toMatch(/\.exclude\(\s*["']\[aria-disabled="true"\]["']\s*\)/);
    }
  });
});
