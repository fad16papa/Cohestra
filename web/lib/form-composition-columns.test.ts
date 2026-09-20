import { describe, expect, it } from "vitest";

import {
  addColumnsBlock,
  addInputFieldBlock,
  getBuilderCanvasRows,
  moveCompositionBlockToColumn,
  removeCompositionBlock,
  reorderCompositionBlocks,
} from "@/lib/form-composition-mutations";
import { buildCompositionPreviewFingerprint } from "@/lib/form-composition-preview-fingerprint";

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

describe("form composition columns", () => {
  it("adds columns with two non-empty columns", () => {
    const next = addColumnsBlock(baseV1);
    const columns = next.composition?.find((node) => node.kind === "columns");
    expect(columns?.columns).toHaveLength(2);
    expect(columns?.columns?.[0]?.length).toBeGreaterThan(0);
    expect(columns?.columns?.[1]?.length).toBeGreaterThan(0);
  });

  it("unwraps column children when columns row is deleted", () => {
    let schema = addColumnsBlock(baseV1);
    schema = addInputFieldBlock(schema, "text");
    const columnsId = schema.composition?.find((node) => node.kind === "columns")?.id;
    expect(columnsId).toBeTruthy();
    schema = removeCompositionBlock(schema, columnsId!);
    expect(schema.composition?.some((node) => node.kind === "columns")).toBe(false);
    expect(schema.composition?.some((node) => node.kind === "fieldRef")).toBe(true);
  });

  it("moves a block between columns", () => {
    let schema = addColumnsBlock(baseV1);
    schema = addInputFieldBlock(schema, "text", {
      selectedBlockId: schema.composition?.find((node) => node.kind === "columns")?.id,
    });
    const fieldBlock = schema.composition
      ?.find((node) => node.kind === "columns")
      ?.columns?.[0]?.find((node) => node.kind === "fieldRef");
    expect(fieldBlock?.id).toBeTruthy();
    schema = moveCompositionBlockToColumn(schema, fieldBlock!.id, 1);
    const rightColumn = schema.composition?.find((node) => node.kind === "columns")
      ?.columns?.[1];
    expect(rightColumn?.some((node) => node.kind === "fieldRef")).toBe(true);
  });

  it("changes preview fingerprint when moving between columns", () => {
    let schema = addColumnsBlock(baseV1);
    schema = addInputFieldBlock(schema, "text", {
      selectedBlockId: schema.composition?.find((node) => node.kind === "columns")?.id,
    });
    const before = buildCompositionPreviewFingerprint(schema.fields, schema.composition);
    const fieldBlock = schema.composition
      ?.find((node) => node.kind === "columns")
      ?.columns?.[0]?.find((node) => node.kind === "fieldRef");
    schema = moveCompositionBlockToColumn(schema, fieldBlock!.id, 1);
    const after = buildCompositionPreviewFingerprint(schema.fields, schema.composition);
    expect(before).not.toBe(after);
  });

  it("supports cross-container drag reorder via canvas rows", () => {
    let schema = addInputFieldBlock(baseV1, "text");
    schema = addColumnsBlock(schema);
    const rows = getBuilderCanvasRows(schema);
    const fieldRowIndex = rows.findIndex((row) => row.node.kind === "fieldRef");
    const columnChildIndex = rows.findIndex(
      (row) =>
        row.columnIndex === 0 &&
        row.node.kind === "content" &&
        row.node.contentType === "heading"
    );
    expect(fieldRowIndex).toBeGreaterThanOrEqual(0);
    expect(columnChildIndex).toBeGreaterThanOrEqual(0);
    schema = reorderCompositionBlocks(schema, fieldRowIndex, columnChildIndex);
    const columnsNode = schema.composition?.find((node) => node.kind === "columns");
    expect(
      columnsNode?.columns?.[0]?.some((node) => node.kind === "fieldRef")
    ).toBe(true);
  });
});
