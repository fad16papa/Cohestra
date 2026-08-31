import { describe, expect, it } from "vitest";

import { splitMarkdownLiteParagraphs, sanitizeMarkdownLite, hasRenderableMarkdownLiteCopy } from "@/lib/markdown-lite-copy";
import { resolveRegistrationUnavailableChip } from "@/lib/registration-unavailable";

describe("markdown-lite-copy", () => {
  it("strips HTML tags", () => {
    expect(sanitizeMarkdownLite("<b>Hello</b> world")).toBe("Hello world");
  });

  it("splits paragraphs after normalizing line endings", () => {
    expect(splitMarkdownLiteParagraphs("First\r\n\r\nSecond")).toEqual([
      "First",
      "Second",
    ]);
  });

  it("treats HTML-only strings as non-renderable", () => {
    expect(hasRenderableMarkdownLiteCopy("<b></b>")).toBe(false);
    expect(hasRenderableMarkdownLiteCopy("<img src=x onerror=alert(1)>")).toBe(false);
    expect(hasRenderableMarkdownLiteCopy("Waitlist opens Monday")).toBe(true);
  });
});

describe("registration-unavailable", () => {
  it("maps unavailable reasons to reason chips", () => {
    expect(resolveRegistrationUnavailableChip("full")).toBe("Full");
    expect(resolveRegistrationUnavailableChip("plan-limit")).toBe("Paused");
    expect(resolveRegistrationUnavailableChip("close-at")).toBe("Closed");
    expect(resolveRegistrationUnavailableChip("unavailable", "published")).toBe("Ended");
    expect(resolveRegistrationUnavailableChip("unavailable", "archived")).toBe("Closed");
    expect(resolveRegistrationUnavailableChip("not-found")).toBeNull();
  });
});
