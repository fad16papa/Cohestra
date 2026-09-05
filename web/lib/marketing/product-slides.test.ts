import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  CINEMA_SECTION_LEAD,
  CINEMA_SECTION_THESIS,
  PRODUCT_SLIDES,
} from "@/lib/marketing/product-slides";

const HOUSE_TOUR_NAV = [
  "Website",
  "Clients",
  "Activities",
  "Follow-up",
  "Analytics",
  "Cohestra AI",
] as const;

const HOUSE_TOUR_IDS = [
  "website",
  "clients",
  "activities",
  "outreach",
  "analytics",
  "intelligence",
] as const;

const HOUSE_TOUR_FEELINGS = [
  "Belonging",
  "Recognition",
  "Rhythm",
  "Urgency",
  "Clarity",
  "Direction",
] as const;

describe("PRODUCT_SLIDES house-tour rebuild", () => {
  it("locks section thesis and lead", () => {
    expect(CINEMA_SECTION_THESIS).toBe("Walk the club before you sign up");
    expect(CINEMA_SECTION_LEAD).toBe(
      "A house tour through Harbourline Social Club — the same rooms your team opens on Monday."
    );
  });

  it("orders Website → Clients → Activities → Follow-up → Analytics → Cohestra AI", () => {
    expect(PRODUCT_SLIDES).toHaveLength(6);
    expect(PRODUCT_SLIDES.map((s) => s.navLabel)).toEqual([...HOUSE_TOUR_NAV]);
    expect(PRODUCT_SLIDES.map((s) => s.id)).toEqual([...HOUSE_TOUR_IDS]);
    expect(PRODUCT_SLIDES.map((s) => s.feeling)).toEqual([...HOUSE_TOUR_FEELINGS]);
  });

  it("keeps caption-only Feeling → Scene → Proof with ≤3 outcomes", () => {
    for (const slide of PRODUCT_SLIDES) {
      expect(slide.feelingLine.length).toBeGreaterThan(0);
      expect(slide.scene.length).toBeGreaterThan(0);
      expect(slide.job.length).toBeGreaterThan(0);
      expect(slide.outcomes.length).toBeGreaterThan(0);
      expect(slide.outcomes.length).toBeLessThanOrEqual(3);
    }
  });

  it("does not use taxonomy eyebrows, Campaigns/Reports chapters, or SaaS theater", () => {
    const blob = PRODUCT_SLIDES.map(
      (s) => `${s.navLabel} ${s.feeling} ${s.feelingLine} ${s.scene} ${s.outcomes.join(" ")}`
    ).join("\n");
    expect(blob).not.toMatch(/Client CRM|Website builder · Pro|Inside the workspace/i);
    expect(PRODUCT_SLIDES.some((s) => s.navLabel === "Campaigns")).toBe(false);
    expect(PRODUCT_SLIDES.some((s) => s.navLabel === "Reports")).toBe(false);
    expect(PRODUCT_SLIDES.some((s) => s.navLabel === "Dashboard")).toBe(false);
  });
});

describe("cinema source pedagogy kill + composition", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

  it("removes chapter graffiti and keeps caption-strip cinema layout", () => {
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
    expect(combined).toContain("Caption strip");
    expect(cinema).not.toMatch(/lg:grid-cols-\[minmax\(18rem/);
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
