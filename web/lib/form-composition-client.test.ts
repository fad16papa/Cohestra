import { describe, expect, it } from "vitest";

import type { ActivityFormSchema } from "@/lib/activities-api";
import { getCompositionClientIssues } from "@/lib/form-composition-client";

describe("form-composition-client", () => {
  it("flags v2 without composition", () => {
    const schema: ActivityFormSchema = {
      version: 2,
      fields: [
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

    expect(getCompositionClientIssues(schema)).toContain(
      "Form schema version 2 requires a composition layout."
    );
  });

  it("flags duplicate field references", () => {
    const schema: ActivityFormSchema = {
      version: 2,
      fields: [
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
      composition: [
        { id: "a", kind: "fieldRef", fieldId: "email" },
        { id: "b", kind: "fieldRef", fieldId: "email" },
      ],
    };

    expect(getCompositionClientIssues(schema).some((issue) =>
      issue.includes("more than once")
    )).toBe(true);
  });

  it("flags empty columns before save", () => {
    const schema: ActivityFormSchema = {
      version: 2,
      fields: [
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
      composition: [
        {
          id: "cols",
          kind: "columns",
          columns: [[], []],
        },
        { id: "ref", kind: "fieldRef", fieldId: "email" },
      ],
    };

    expect(getCompositionClientIssues(schema)).toContain(
      'Columns block "cols" cannot have an empty column.'
    );
  });

  it("accepts canonical domain blocks and rejects unknown domain types", () => {
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

    const valid: ActivityFormSchema = {
      version: 2,
      fields,
      composition: [
        { id: "details", kind: "domain", domain: "activityDetails" },
        { id: "ref", kind: "fieldRef", fieldId: "email" },
      ],
    };
    expect(getCompositionClientIssues(valid)).toEqual([]);

    const invalid: ActivityFormSchema = {
      version: 2,
      fields,
      composition: [
        { id: "bad", kind: "domain", domain: "location" },
        { id: "ref", kind: "fieldRef", fieldId: "email" },
      ],
    };
    expect(
      getCompositionClientIssues(invalid).some((issue) =>
        issue.includes("unsupported Activity block")
      )
    ).toBe(true);
  });
});
