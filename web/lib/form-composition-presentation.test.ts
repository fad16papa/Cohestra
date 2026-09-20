import { describe, expect, it } from "vitest";

import { compositionHasPresentationBlocks } from "@/lib/form-composition-presentation";

describe("compositionHasPresentationBlocks", () => {
  const fields = [
    {
      id: "email",
      type: "email" as const,
      label: "Email",
      required: true,
      placeholder: null,
      options: null,
      consentText: null,
    },
  ];

  it("returns false for fieldRef-only composition", () => {
    expect(
      compositionHasPresentationBlocks(fields, [
        { id: "ref-email", kind: "fieldRef", fieldId: "email" },
      ])
    ).toBe(false);
  });

  it("returns true when heading content exists", () => {
    expect(
      compositionHasPresentationBlocks(fields, [
        {
          id: "h1",
          kind: "content",
          contentType: "heading",
          content: { text: "Hi", level: 2 },
        },
        { id: "ref-email", kind: "fieldRef", fieldId: "email" },
      ])
    ).toBe(true);
  });

  it("returns true when section exists", () => {
    expect(
      compositionHasPresentationBlocks(fields, [
        {
          id: "sec",
          kind: "section",
          title: "About",
          children: [{ id: "ref-email", kind: "fieldRef", fieldId: "email" }],
        },
      ])
    ).toBe(true);
  });
});
