import { describe, expect, it } from "vitest";

import type { ActivityFormSchema } from "@/lib/activities-api";
import {
  addInputFieldBlock,
  compositionBlockIdForField,
  ensureBuilderEditableSchema,
  getCanvasComposition,
  removeFieldRefBlock,
  reorderCompositionBlocks,
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

  it("reorders composition without changing field ids", () => {
    const editable = ensureBuilderEditableSchema(v1Schema);
    const reordered = reorderCompositionBlocks(editable, 0, 1);
    expect(getCanvasComposition(reordered).map((n) => n.fieldId)).toEqual([
      "email",
      "name",
    ]);
    expect(reordered.fields.map((f) => f.id).sort()).toEqual(["email", "name"]);
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
