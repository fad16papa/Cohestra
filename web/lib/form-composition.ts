import type { FormCompositionNode, FormFieldDefinition } from "@/lib/activities-api";

export type { FormCompositionNode } from "@/lib/activities-api";

export const FORM_SCHEMA_VERSION_V1 = 1;
export const FORM_SCHEMA_VERSION_V2 = 2;

export function synthesizeLinearComposition(
  fields: FormFieldDefinition[]
): FormCompositionNode[] {
  return fields.map((field) => ({
    id: `field-ref-${field.id}`,
    kind: "fieldRef" as const,
    fieldId: field.id,
  }));
}

export function hasStoredComposition(
  composition: FormCompositionNode[] | null | undefined
): boolean {
  return Array.isArray(composition) && composition.length > 0;
}

export function getEffectiveComposition(
  fields: FormFieldDefinition[],
  composition: FormCompositionNode[] | null | undefined
): FormCompositionNode[] {
  if (hasStoredComposition(composition)) {
    return composition!;
  }

  return synthesizeLinearComposition(fields);
}

/** Normalize v1/v2 read paths — does not bump version. */
export function normalizeCompositionOnRead(
  fields: FormFieldDefinition[],
  composition: FormCompositionNode[] | null | undefined
): FormCompositionNode[] | null {
  if (hasStoredComposition(composition)) {
    return composition!;
  }

  return null;
}
