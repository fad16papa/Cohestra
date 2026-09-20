import { describe, expect, it } from "vitest";

import type { FormFieldDefinition } from "@/lib/activities-api";
import {
  getEffectiveComposition,
  hasStoredComposition,
  synthesizeLinearComposition,
} from "@/lib/form-composition";
import {
  formSchemaForPersist,
  getFormSchemaEffectiveComposition,
  normalizeFormSchema,
} from "@/lib/form-schema-utils";

const sampleFields: FormFieldDefinition[] = [
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
];

describe("form-composition", () => {
  it("synthesizes linear fieldRef nodes", () => {
    const nodes = synthesizeLinearComposition(sampleFields);
    expect(nodes).toHaveLength(2);
    expect(nodes[0]?.kind).toBe("fieldRef");
    expect(nodes[0]?.fieldId).toBe("name");
  });

  it("normalizeFormSchema leaves composition null for legacy v1", () => {
    const normalized = normalizeFormSchema({
      version: 1,
      fields: sampleFields,
    });
    expect(normalized.composition).toBeNull();
    expect(getFormSchemaEffectiveComposition(normalized)).toHaveLength(2);
  });

  it("formSchemaForPersist strips composition for v1", () => {
    const payload = formSchemaForPersist({
      version: 1,
      fields: sampleFields,
      composition: synthesizeLinearComposition(sampleFields),
    });
    expect(payload.composition).toBeUndefined();
  });

  it("detects stored composition", () => {
    expect(hasStoredComposition(null)).toBe(false);
    expect(hasStoredComposition([])).toBe(false);
    expect(
      hasStoredComposition([{ id: "a", kind: "fieldRef", fieldId: "name" }])
    ).toBe(true);
  });

  it("getEffectiveComposition prefers stored nodes", () => {
    const custom = [{ id: "x", kind: "fieldRef" as const, fieldId: "email" }];
    expect(getEffectiveComposition(sampleFields, custom)).toEqual(custom);
  });
});
