import { describe, expect, it } from "vitest";

import type { FormFieldDefinition } from "@/lib/activities-api";
import { createFieldId, getFormSchemaClientIssues } from "@/lib/form-schema-utils";

function field(
  overrides: Partial<FormFieldDefinition> & Pick<FormFieldDefinition, "id" | "type">
): FormFieldDefinition {
  return {
    label: overrides.label ?? overrides.id,
    required: false,
    placeholder: null,
    options: null,
    consentText: null,
    ...overrides,
  };
}

describe("createFieldId", () => {
  it("prefers notes and date when those ids are free", () => {
    expect(createFieldId("textarea", new Set())).toBe("notes");
    expect(createFieldId("date", new Set())).toBe("date");
    expect(createFieldId("textarea", new Set(["notes"]))).toBe("notes-2");
    expect(createFieldId("date", new Set(["date"]))).toBe("date-2");
  });
});

describe("getFormSchemaClientIssues", () => {
  it("rejects defaultValue on non-hidden fields", () => {
    const issues = getFormSchemaClientIssues({
      version: 1,
      fields: [
        field({
          id: "full_name",
          type: "text",
          label: "Full name",
          defaultValue: "Maya",
        }),
        field({
          id: "about",
          type: "section_header",
          label: "About",
          defaultValue: "nope",
        }),
      ],
    });

    expect(issues.some((issue) => issue.includes("cannot have a default value"))).toBe(
      true
    );
  });

  it("allows defaultValue on Hidden and rejects phoneCountry", () => {
    const issues = getFormSchemaClientIssues({
      version: 1,
      fields: [
        field({
          id: "ref",
          type: "hidden",
          label: "Campaign ref",
          defaultValue: "ig",
          phoneCountry: "SG",
        }),
      ],
    });

    expect(issues.some((issue) => issue.includes("cannot have a default value"))).toBe(
      false
    );
    expect(issues.some((issue) => issue.includes("cannot have a phone country"))).toBe(
      true
    );
  });
});
