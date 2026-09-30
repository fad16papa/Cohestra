import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SKIP_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/layouts/admin-skip-link.tsx"),
  "utf8"
);
const LAYOUT_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/layouts/dashboard-layout.tsx"),
  "utf8"
);
const SETTINGS_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/settings/settings-page-content.tsx"),
  "utf8"
);
const RENDERER_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/marketing/site-page-renderer.tsx"),
  "utf8"
);
const OPEN_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/registration/public-registration-open.tsx"),
  "utf8"
);
const BUILDER_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/website/website-builder-page.tsx"),
  "utf8"
);
const FORM_BUILDER_SOURCE = readFileSync(
  resolve(import.meta.dirname, "../components/activities/form-composition-builder.tsx"),
  "utf8"
);

describe("Story 38.5 landmark source contract (supplement)", () => {
  it("defines a unique skip target id and never hides the skip link with display:none", () => {
    expect(SKIP_SOURCE).toContain('export const MAIN_CONTENT_ID = "main-content"');
    expect(SKIP_SOURCE).toContain("Skip to main content");
    expect(SKIP_SOURCE).toContain("sr-only");
    expect(SKIP_SOURCE).not.toMatch(/display:\s*none/);
    expect(SKIP_SOURCE).not.toMatch(/\bhidden\b/);
    expect(SKIP_SOURCE).toContain("preventDefault");
    expect(SKIP_SOURCE).toContain("target.focus");
  });

  it("keeps skip outside the overflow shell and a single main id", () => {
    expect(LAYOUT_SOURCE.indexOf("<AdminSkipLink")).toBeLessThan(
      LAYOUT_SOURCE.indexOf("overflow-hidden")
    );
    expect(LAYOUT_SOURCE).toMatch(/<main[\s\S]*id=\{MAIN_CONTENT_ID\}/);
    expect(LAYOUT_SOURCE.match(/<main/g)?.length).toBe(1);
  });

  it("removes the nested Settings main landmark", () => {
    expect(SETTINGS_SOURCE).not.toMatch(/<main/);
    expect(SETTINGS_SOURCE).toContain('aria-labelledby="settings-active-section-heading"');
  });

  it("uses one SitePageRenderer with an embedded semantic context", () => {
    expect(RENDERER_SOURCE).toContain("embedded?: boolean");
    expect(RENDERER_SOURCE).toContain('const BodyTag = embedded ? "div" : "main"');
    expect(RENDERER_SOURCE).toContain('const HeaderTag = embedded ? "div" : "header"');
    expect(RENDERER_SOURCE).toContain('const FooterTag = embedded ? "div" : "footer"');
    expect(RENDERER_SOURCE).toContain('const TitleTag = embedded ? "h2" : "h1"');
    expect(BUILDER_SOURCE).toContain("<SitePageRenderer site={previewPayload} isPreview embedded />");
  });

  it("offsets Form Studio preview headings without a second renderer", () => {
    expect(OPEN_SOURCE).toContain("const titleHeadingLevel: 1 | 2 = isPreview ? 2 : 1");
    expect(OPEN_SOURCE).not.toMatch(/createPortal/);
  });

  it("keeps Form Studio builder headings under the Form builder h2", () => {
    expect(FORM_BUILDER_SOURCE).toContain('<h2 className="text-section text-text-warm">Form builder</h2>');
    expect(FORM_BUILDER_SOURCE).toContain("Block palette");
    expect(FORM_BUILDER_SOURCE).toContain('id="form-block-palette-heading"');
    expect(FORM_BUILDER_SOURCE).not.toMatch(/<h4[^>]*>\s*Block palette/);
    expect(FORM_BUILDER_SOURCE).toMatch(/<h3[^>]*>\s*Form structure\s*<\/h3>/);
    expect(FORM_BUILDER_SOURCE).toMatch(/<h3[^>]*>\s*Block properties\s*<\/h3>/);
    expect(FORM_BUILDER_SOURCE).toContain('aria-labelledby="form-block-palette-heading"');
  });
});
