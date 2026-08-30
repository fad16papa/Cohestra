import { describe, expect, it } from "vitest";

import { splitMarkdownLiteParagraphs, sanitizeMarkdownLite } from "@/lib/markdown-lite-copy";
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
});

describe("registration-unavailable", () => {
  it("maps unavailable reasons to reason chips", () => {
    expect(resolveRegistrationUnavailableChip("full")).toBe("Full");
    expect(resolveRegistrationUnavailableChip("plan-limit")).toBe("Paused");
    expect(resolveRegistrationUnavailableChip("unavailable", "published")).toBe("Ended");
    expect(resolveRegistrationUnavailableChip("unavailable", "archived")).toBe("Closed");
    expect(resolveRegistrationUnavailableChip("not-found")).toBeNull();
  });
});
