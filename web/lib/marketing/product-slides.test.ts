import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  CINEMA_SECTION_LEAD,
  CINEMA_SECTION_THESIS,
  PRODUCT_SLIDES,
} from "@/lib/marketing/product-slides";

const LOCKED_FEELINGS = [
  "Relief",
  "Connection",
  "Control",
  "Reach",
  "Proof",
  "Pride",
] as const;

describe("PRODUCT_SLIDES feeling copy (Story 33.2)", () => {
  it("locks section thesis and lead", () => {
    expect(CINEMA_SECTION_THESIS).toBe("A week with your people");
    expect(CINEMA_SECTION_LEAD).toBe(
      "A week inside a club like yours — the same rooms your team will open on Monday."
    );
  });

  it("uses Feeling → Scene → Proof with ≤3 outcomes and locked feeling words", () => {
    expect(PRODUCT_SLIDES).toHaveLength(6);
    expect(PRODUCT_SLIDES.map((s) => s.feeling)).toEqual([...LOCKED_FEELINGS]);

    for (const slide of PRODUCT_SLIDES) {
      expect(slide.feelingLine.length).toBeGreaterThan(0);
      expect(slide.scene.length).toBeGreaterThan(0);
      expect(slide.job.length).toBeGreaterThan(0);
      expect(slide.outcomes.length).toBeGreaterThan(0);
      expect(slide.outcomes.length).toBeLessThanOrEqual(3);
    }
  });

  it("does not use taxonomy eyebrows or Pro chip theater in room copy", () => {
    const blob = PRODUCT_SLIDES.map(
      (s) => `${s.feeling} ${s.feelingLine} ${s.scene} ${s.outcomes.join(" ")}`
    ).join("\n");
    expect(blob).not.toMatch(/Client CRM|Website builder · Pro|Inside the workspace/i);
  });
});

describe("cinema source pedagogy kill (Story 33.2)", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

  it("removes chapter graffiti and checklist chrome from cinema + legacy", () => {
    const cinema = readFileSync(
      join(root, "components/marketing/marketing-product-cinema.tsx"),
      "utf8"
    );
    const legacy = readFileSync(
      join(root, "components/marketing/marketing-product-carousel.legacy.tsx"),
      "utf8"
    );
    const combined = `${cinema}\n${legacy}`;

    expect(combined).not.toMatch(/Inside the workspace/);
    expect(combined).not.toMatch(/Chapter \$\{/);
    expect(combined).not.toMatch(/Scroll to continue/);
    expect(combined).not.toMatch(/chapterNumber/);
    expect(combined).not.toMatch(/from \"lucide-react\".*Check|Check.*lucide-react/);
    expect(combined).toContain("CINEMA_SECTION_THESIS");
    expect(combined).toContain("CINEMA_SECTION_LEAD");
    expect(combined).toContain("slide.feeling");
    expect(combined).toContain("slide.outcomes");
  });

  it("deletes ShowcaseBrowserChrome mock authenticity files", () => {
    const showcaseMocks = join(
      root,
      "components/marketing/marketing-product-showcase-mocks.tsx"
    );
    const crmShowcase = join(root, "components/marketing/marketing-crm-showcase.tsx");
    expect(() => readFileSync(showcaseMocks)).toThrow();
    expect(() => readFileSync(crmShowcase)).toThrow();
  });
});
