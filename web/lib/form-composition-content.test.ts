import { describe, expect, it } from "vitest";

import {
  addContentBlock,
  addDomainBlock,
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

  it("adds domain blocks without creating response fields", () => {
    const next = addDomainBlock(baseV1, "activityDetails");
    expect(next.fields).toHaveLength(1);
    const domain = next.composition?.find((node) => node.kind === "domain");
    expect(domain).toMatchObject({
      kind: "domain",
      domain: "activityDetails",
    });
    expect(domain?.id).toBeTruthy();
    expect(JSON.stringify(domain)).not.toMatch(/East Coast|Friday|Harbourline/);
  });

  it("deletes a domain block without removing fields", () => {
    let schema = addDomainBlock(baseV1, "capacityStatus");
    const domainId = schema.composition?.find((node) => node.kind === "domain")?.id;
    schema = removeCompositionBlock(schema, domainId!);
    expect(schema.fields).toHaveLength(1);
    expect(schema.composition?.some((node) => node.kind === "domain")).toBe(false);
  });

  it("adds section with required child heading", () => {
    const next = addSectionBlock(baseV1);
    const section = next.composition?.find((node) => node.kind === "section");
    expect(section?.children?.length).toBeGreaterThan(0);
  });

  it("unwraps section children when section is deleted", () => {
    let schema = addContentBlock(baseV1, "heading");
    schema = addSectionBlock(schema);
    const sectionId = schema.composition?.find((node) => node.kind === "section")?.id;
    expect(sectionId).toBeTruthy();
    schema = addInputFieldBlock(schema, "text", { selectedBlockId: sectionId });
    schema = addContentBlock(schema, "paragraph", { selectedBlockId: sectionId });
    schema = addInputFieldBlock(schema, "text", { selectedBlockId: sectionId });
    schema = addInputFieldBlock(schema, "text");
    const beforeIds = getBuilderCanvasRows(schema).map((row) => row.node.id);
    schema = removeCompositionBlock(schema, sectionId!);
    expect(schema.composition?.some((node) => node.kind === "section")).toBe(false);
    const afterIds = getBuilderCanvasRows(schema).map((row) => row.node.id);
    expect(afterIds.filter((id) => beforeIds.includes(id)).length).toBeGreaterThan(0);
    expect(
      getBuilderCanvasRows(schema).filter((row) => row.node.kind === "fieldRef").length
    ).toBe(4);
  });
});
