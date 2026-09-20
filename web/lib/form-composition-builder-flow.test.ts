import { describe, expect, it } from "vitest";

import type { ActivityFormSchema } from "@/lib/activities-api";
import { buildFormStudioPreviewKey } from "@/lib/form-studio-preview-key";
import {
  addInputFieldBlock,
  ensureBuilderEditableSchema,
  findFieldIndexByBlockId,
  reorderCompositionBlocks,
} from "@/lib/form-composition-mutations";
import { orderFieldsByComposition } from "@/lib/form-composition-order";
import { formSchemaForPersist } from "@/lib/form-schema-utils";

describe("form composition builder flow", () => {
  it("preserves selected block identity after keyboard reorder", () => {
    let schema: ActivityFormSchema = {
      version: 1,
      fields: [
        {
          id: "a",
          type: "text",
          label: "A",
          required: false,
          placeholder: null,
          options: null,
          consentText: null,
        },
        {
          id: "b",
          type: "text",
          label: "B",
          required: false,
          placeholder: null,
          options: null,
          consentText: null,
        },
      ],
    };

    schema = addInputFieldBlock(schema, "email");
    const canvas = ensureBuilderEditableSchema(schema);
    const selectedBlockId = canvas.composition?.[0]?.id ?? null;
    const selectedFieldId = canvas.composition?.[0]?.fieldId ?? null;
    expect(selectedBlockId).toBeTruthy();
    expect(selectedFieldId).toBe("a");

    schema = reorderCompositionBlocks(canvas, 0, 1);
    expect(
      schema.composition?.find((node) => node.id === selectedBlockId)?.fieldId
    ).toBe(selectedFieldId);
    expect(findFieldIndexByBlockId(schema, selectedBlockId)).toBe(
      schema.fields.findIndex((field) => field.id === selectedFieldId)
    );
  });

  it("round-trips v2 persist payload with composition order", () => {
    let schema = ensureBuilderEditableSchema({
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
    });

    schema = reorderCompositionBlocks(schema, 0, 1);
    const payload = formSchemaForPersist(schema);
    expect(payload.version).toBe(2);
    expect(payload.composition?.map((node) => node.fieldId)).toEqual([
      "email",
      "name",
    ]);

    const reloaded: ActivityFormSchema = structuredClone(payload);
    expect(
      orderFieldsByComposition(
        reloaded.fields,
        reloaded.composition ?? null,
        reloaded.version ?? 1
      ).map((field) => field.id)
    ).toEqual(["email", "name"]);
  });

  it("updates preview key when composition order changes without save", () => {
    const base = ensureBuilderEditableSchema({
      version: 1,
      fields: [
        {
          id: "x",
          type: "text",
          label: "X",
          required: false,
          placeholder: null,
          options: null,
          consentText: null,
        },
        {
          id: "y",
          type: "text",
          label: "Y",
          required: false,
          placeholder: null,
          options: null,
          consentText: null,
        },
      ],
    });

    const before = buildFormStudioPreviewKey(base);
    const after = buildFormStudioPreviewKey(reorderCompositionBlocks(base, 0, 1));
    expect(before).not.toBe(after);
  });

  it("handles 20+ block reorder without changing field ids", () => {
    let schema: ActivityFormSchema = { version: 1, fields: [] };
    for (let index = 0; index < 22; index += 1) {
      schema = addInputFieldBlock(schema, "text");
    }

    const idsBefore = schema.fields.map((field) => field.id);
    schema = reorderCompositionBlocks(schema, 0, 21);
    schema = reorderCompositionBlocks(schema, 21, 0);
    expect(schema.fields.map((field) => field.id).sort()).toEqual(
      idsBefore.sort()
    );
    expect(schema.composition).toHaveLength(22);
  });
});
