import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  PRODUCT_DOCS_GROUPS,
  PRODUCT_DOCS_LEGACY_ANCHORS,
  PRODUCT_DOCS_SECTION_IDS,
  PRODUCT_DOCS_SECTIONS,
} from "@/lib/marketing/product-docs-content";
import { isAllowedDocsImageSrc } from "@/lib/marketing/product-docs-images";

const publicDir = resolve(import.meta.dirname, "../../public");
const docsPage = readFileSync(
  resolve(import.meta.dirname, "../../components/marketing/product-docs-page.tsx"),
  "utf8"
);
const imageComponent = readFileSync(
  resolve(import.meta.dirname, "../../components/marketing/product-docs-image.tsx"),
  "utf8"
);
const allText = JSON.stringify(PRODUCT_DOCS_SECTIONS);

function imageBlocks() {
  return PRODUCT_DOCS_SECTIONS.flatMap((section) =>
    section.blocks.filter((block) => block.type === "image")
  );
}

describe("Documentation 2.0 content contract", () => {
  it("keeps every legacy /docs fragment", () => {
    for (const id of PRODUCT_DOCS_LEGACY_ANCHORS) {
      expect(PRODUCT_DOCS_SECTION_IDS).toContain(id);
    }
  });

  it("uses the 11 chapter groups", () => {
    expect(PRODUCT_DOCS_GROUPS.map((group) => group.id)).toEqual([
      "start",
      "workspace",
      "activities",
      "form-studio",
      "publishing",
      "people",
      "website",
      "campaigns",
      "insights",
      "account",
      "help",
    ]);
  });

  it("documents canonical rooms and plan locks", () => {
    expect(allText).toContain("/analytics");
    expect(allText).toContain("/reports");
    expect(allText).toContain("/ai");
    expect(allText).toContain("/follow-up");
    expect(allText).toContain("/dashboard/website");
    expect(allText).toContain("Due now");
    expect(allText).toContain("Build form");
    expect(allText).toContain("never creates a public registration");
    expect(allText).toContain("Core and above");
    expect(allText).toContain("Pro-only");
    expect(allText).not.toMatch(/Platform Admin/i);
    expect(allText).not.toContain("/platform");
    expect(allText).not.toContain("Walk the club before you sign up");
    expect(allText).toContain("not a free-form chatbot");
  });

  it("ships 19 allowlisted screenshots that exist on disk", () => {
    const images = imageBlocks();
    expect(images.length).toBe(19);
    expect(images.some((image) => image.src.endsWith("05b-form-studio-composition.png"))).toBe(
      true
    );
    for (const image of images) {
      expect(isAllowedDocsImageSrc(image.src)).toBe(true);
      expect(existsSync(resolve(publicDir, image.src.replace(/^\//, "")))).toBe(true);
      expect(image.alt.length).toBeGreaterThan(8);
      expect(image.caption.length).toBeGreaterThan(8);
      expect(image.width).toBeGreaterThan(0);
      expect(image.height).toBeGreaterThan(0);
    }
  });

  it("renders image blocks and an accessible lightbox", () => {
    expect(docsPage).toContain("ProductDocsImage");
    expect(imageComponent).toContain('role="dialog"');
    expect(imageComponent).toContain("Escape");
    expect(imageComponent).toContain("loading=\"lazy\"");
    expect(imageComponent).toContain("isAllowedDocsImageSrc");
    expect(imageComponent).toContain("Tab");
  });

  it("rejects unsafe screenshot sources", () => {
    expect(isAllowedDocsImageSrc("/docs-screenshots/01-login.png")).toBe(true);
    expect(isAllowedDocsImageSrc("/docs-screenshots/form.webp")).toBe(true);
    expect(isAllowedDocsImageSrc("/docs-screenshots/../secret.png")).toBe(false);
    expect(isAllowedDocsImageSrc("https://example.com/x.png")).toBe(false);
    expect(isAllowedDocsImageSrc("/other/01-login.png")).toBe(false);
    expect(isAllowedDocsImageSrc("/docs-screenshots/not-an-image.txt")).toBe(false);
  });
});
