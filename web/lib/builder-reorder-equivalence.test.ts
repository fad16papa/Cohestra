import { describe, expect, it } from "vitest";

import type { ActivityFormSchema } from "@/lib/activities-api";
import {
  getBuilderCanvasRows,
  reorderCompositionBlocks,
} from "@/lib/form-composition-mutations";

function field(id: string, type: "text" | "email", label: string) {
  return {
    id,
    type,
    label,
    required: false,
    placeholder: null,
    options: null,
    consentText: null,
  };
}

const nestedSchema: ActivityFormSchema = {
  version: 2,
  fields: [
    field("full_name", "text", "Full name"),
    field("nested_note", "text", "Nested note"),
    field("nested_phone", "text", "Nested phone"),
    field("email", "email", "Email"),
  ],
  composition: [
    { id: "block-name", kind: "fieldRef", fieldId: "full_name" },
    {
      id: "block-cols",
      kind: "columns",
      columns: [
        [
          { id: "block-nested", kind: "fieldRef", fieldId: "nested_note" },
          { id: "block-phone", kind: "fieldRef", fieldId: "nested_phone" },
        ],
        [
          {
            id: "block-para",
            kind: "content",
            contentType: "paragraph",
            content: { text: "Right column copy", level: null },
          },
        ],
      ],
    },
    { id: "block-email", kind: "fieldRef", fieldId: "email" },
  ],
};

describe("Story 42.3 operation equivalence", () => {
  it("mouse, keyboard, and pointer share the same reorderCompositionBlocks result", () => {
    const rows = getBuilderCanvasRows(nestedSchema);
    const name = rows.findIndex((row) => row.node.id === "block-name");
    const email = rows.findIndex((row) => row.node.id === "block-email");
    expect(name).toBeGreaterThan(-1);
    expect(email).toBeGreaterThan(name);

    const byMouse = reorderCompositionBlocks(nestedSchema, name, email);
    const byKeyboard = reorderCompositionBlocks(nestedSchema, name, email);
    const byPointer = reorderCompositionBlocks(nestedSchema, name, email);

    expect(byMouse).toEqual(byKeyboard);
    expect(byPointer).toEqual(byMouse);
    expect(byMouse.fields.map((entry) => entry.id)).toEqual(
      nestedSchema.fields.map((entry) => entry.id)
    );
    expect(byMouse.composition?.map((node) => node.id)).toEqual([
      "block-cols",
      "block-email",
      "block-name",
    ]);
  });

  it("same-index and missing-index reorders do not change schema", () => {
    expect(reorderCompositionBlocks(nestedSchema, 0, 0)).toEqual(nestedSchema);
    expect(reorderCompositionBlocks(nestedSchema, 0, 99)).toEqual(nestedSchema);
  });

  it("nested sibling reorder stays inside the column", () => {
    const rows = getBuilderCanvasRows(nestedSchema);
    const note = rows.findIndex((row) => row.node.id === "block-nested");
    const phone = rows.findIndex((row) => row.node.id === "block-phone");
    expect(note).toBeGreaterThan(-1);
    expect(phone).toBeGreaterThan(note);

    const next = reorderCompositionBlocks(nestedSchema, note, phone);
    const nextRows = getBuilderCanvasRows(next);
    expect(nextRows[phone]?.node.id).toBe("block-nested");
    expect(nextRows[note]?.node.id).toBe("block-phone");
    const columns = next.composition?.find((node) => node.id === "block-cols");
    expect(columns?.columns?.[0]?.map((node) => node.id)).toEqual([
      "block-phone",
      "block-nested",
    ]);
  });
});
