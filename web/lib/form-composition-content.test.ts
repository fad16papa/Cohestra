import { describe, expect, it } from "vitest";

import {
  addContentBlock,
  addInputFieldBlock,
  addSectionBlock,
  getBuilderCanvasRows,
  removeCompositionBlock,
  reorderCompositionBlocks,
} from "@/lib/form-composition-mutations";

const baseV1 = {
  version: 1,
  fields: [
    {
      id: "email",
      type: "email" as const,
      label: "Email",
      required: true,
      placeholder: null,
      options: null,
      consentText: null,
    },
  ],
};

describe("form composition content blocks", () => {
  it("adds heading without creating a field definition", () => {
    const next = addContentBlock(baseV1, "heading");
    expect(next.fields).toHaveLength(1);
    expect(next.composition?.some((node) => node.kind === "content")).toBe(true);
  });

  it("orders mixed field and content blocks", () => {
    let schema = addContentBlock(baseV1, "heading");
    schema = addInputFieldBlock(schema, "text");
    const kinds = getBuilderCanvasRows(schema).map((row) => row.node.kind);
    expect(kinds).toEqual(["fieldRef", "content", "fieldRef"]);
  });

  it("reorders mixed top-level blocks", () => {
    let schema = addInputFieldBlock(baseV1, "text");
    schema = addContentBlock(schema, "paragraph");
    const rows = getBuilderCanvasRows(schema);
    expect(rows).toHaveLength(3);
    schema = reorderCompositionBlocks(schema, 0, 2);
    expect(getBuilderCanvasRows(schema).map((row) => row.node.kind)).toEqual([
      "fieldRef",
      "content",
      "fieldRef",
    ]);
  });

  it("adds section with required child heading", () => {
    const next = addSectionBlock(baseV1);
    const section = next.composition?.find((node) => node.kind === "section");
    expect(section?.children?.length).toBeGreaterThan(0);
  });

  it("unwraps section children when section is deleted", () => {
    let schema = addSectionBlock(baseV1);
    const sectionId = schema.composition?.find((node) => node.kind === "section")?.id;
    expect(sectionId).toBeTruthy();
    schema = addInputFieldBlock(schema, "text", { selectedBlockId: sectionId });
    schema = removeCompositionBlock(schema, sectionId!);
    expect(schema.composition?.some((node) => node.kind === "section")).toBe(false);
    expect(schema.composition?.some((node) => node.kind === "fieldRef")).toBe(true);
  });
});
