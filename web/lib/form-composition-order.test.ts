import { describe, expect, it } from "vitest";

import type { ActivityFormSchema } from "@/lib/activities-api";
import {
  flattenFieldRefOrder,
  orderFieldsByComposition,
} from "@/lib/form-composition-order";

describe("form-composition-order", () => {
  it("orders fields by v2 composition", () => {
    const schema: ActivityFormSchema = {
      version: 2,
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
      composition: [
        { id: "ref-b", kind: "fieldRef", fieldId: "b" },
        { id: "ref-a", kind: "fieldRef", fieldId: "a" },
      ],
    };

    expect(orderFieldsByComposition(schema.fields, schema.composition, 2).map(
      (f) => f.id
    )).toEqual(["b", "a"]);
    expect(flattenFieldRefOrder(schema.composition)).toEqual(["b", "a"]);
  });

  it("orders nested section fieldRefs depth-first", () => {
    const composition = [
      { id: "ref-top", kind: "fieldRef" as const, fieldId: "top" },
      {
        id: "section-1",
        kind: "section" as const,
        title: "Inner",
        children: [
          { id: "ref-inner", kind: "fieldRef" as const, fieldId: "inner" },
        ],
      },
      { id: "ref-tail", kind: "fieldRef" as const, fieldId: "tail" },
    ];
    expect(flattenFieldRefOrder(composition)).toEqual(["top", "inner", "tail"]);
  });

  it("falls back to field array order for v1", () => {
    const fields = [
      {
        id: "x",
        type: "text" as const,
        label: "X",
        required: false,
        placeholder: null,
        options: null,
        consentText: null,
      },
      {
        id: "y",
        type: "text" as const,
        label: "Y",
        required: false,
        placeholder: null,
        options: null,
        consentText: null,
      },
    ];

    expect(orderFieldsByComposition(fields, null, 1).map((f) => f.id)).toEqual([
      "x",
      "y",
    ]);
  });
});
