import { describe, expect, it } from "vitest";

import type { ActivityFormSchema } from "@/lib/activities-api";
import {
  addInputFieldBlock,
  compositionBlockIdForField,
  ensureBuilderEditableSchema,
  getCanvasComposition,
  removeFieldRefBlock,
  reorderCompositionBlocks,
  syncCompositionAfterFieldIdChange,
} from "@/lib/form-composition-mutations";
import { FORM_SCHEMA_VERSION_V2 } from "@/lib/form-composition";

const v1Schema: ActivityFormSchema = {
  version: 1,
  fields: [
    {
      id: "name",
      type: "text",
      label: "Name",
      required: true,
      placeholder: null,
      options: null,
      consentText: null,
    },
    {
      id: "email",
      type: "email",
      label: "Email",
      required: true,
      placeholder: null,
      options: null,
      consentText: null,
    },
  ],
};

describe("form-composition-mutations", () => {
  it("projects v1 into v2 composition on first edit", () => {
    const next = ensureBuilderEditableSchema(v1Schema);
    expect(next.version).toBe(FORM_SCHEMA_VERSION_V2);
    expect(getCanvasComposition(next)).toHaveLength(2);
    expect(getCanvasComposition(next).map((n) => n.fieldId)).toEqual([
      "name",
      "email",
    ]);
  });

  it("adds field and fieldRef atomically with stable ids", () => {
    const next = addInputFieldBlock(v1Schema, "phone");
    const canvas = getCanvasComposition(next);
    const added = next.fields.find((f) => f.type === "phone");
    expect(added).toBeDefined();
    expect(canvas[canvas.length - 1]).toMatchObject({
      id: compositionBlockIdForField(added!.id),
      kind: "fieldRef",
      fieldId: added!.id,
    });
  });

  it("reorders canvas indices without moving non-fieldRef siblings", () => {
    const editable = ensureBuilderEditableSchema(v1Schema);
    const withDivider: ActivityFormSchema = {
      ...editable,
      composition: [
        editable.composition![0]!,
        {
          id: "divider-1",
          kind: "content",
          contentType: "divider",
        },
        editable.composition![1]!,
      ],
    };

    const reordered = reorderCompositionBlocks(withDivider, 0, 1);
    expect(reordered.composition?.map((node) => node.kind)).toEqual([
      "fieldRef",
      "content",
      "fieldRef",
    ]);
    expect(
      reordered.composition
        ?.filter((node) => node.kind === "fieldRef")
        .map((node) => node.fieldId)
    ).toEqual(["email", "name"]);
  });

  it("reorders composition without changing field ids", () => {
    const editable = ensureBuilderEditableSchema(v1Schema);
    const reordered = reorderCompositionBlocks(editable, 0, 1);
    expect(getCanvasComposition(reordered).map((n) => n.fieldId)).toEqual([
      "email",
      "name",
    ]);
    expect(reordered.fields.map((f) => f.id).sort()).toEqual(["email", "name"]);
  });

  it("keeps fieldRef in sync when field id changes", () => {
    const editable = ensureBuilderEditableSchema(v1Schema);
    const renamed = syncCompositionAfterFieldIdChange(
      { ...editable, fields: editable.fields.map((f) => (f.id === "name" ? { ...f, id: "full_name" } : f)) },
      "name",
      "full_name"
    );
    expect(getCanvasComposition(renamed).find((n) => n.fieldId === "full_name")).toMatchObject({
      id: "field-ref-full_name",
      kind: "fieldRef",
    });
  });

  it("removes fieldRef and matching field", () => {
    const editable = ensureBuilderEditableSchema(v1Schema);
    const blockId = compositionBlockIdForField("name");
    const next = removeFieldRefBlock(editable, blockId);
    expect(next.fields.some((f) => f.id === "name")).toBe(false);
    expect(getCanvasComposition(next).some((n) => n.fieldId === "name")).toBe(
      false
    );
  });
});
