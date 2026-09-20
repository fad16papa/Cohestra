import type { FormFieldDefinition } from "@/lib/activities-api";

export const FORM_SCHEMA_VERSION_V1 = 1;
export const FORM_SCHEMA_VERSION_V2 = 2;

export type FormCompositionContentType = "heading" | "paragraph" | "divider" | "image";

export type FormCompositionDomainType =
  | "activityDetails"
  | "communityIdentity"
  | "capacityStatus";

export type FormCompositionKind =
  | "fieldRef"
  | "content"
  | "section"
  | "columns"
  | "domain";

export type FormCompositionContentProps = {
  text?: string | null;
  level?: number | null;
  imageUrl?: string | null;
  alt?: string | null;
};

export type FormCompositionNode = {
  id: string;
  kind: FormCompositionKind;
  fieldId?: string | null;
  contentType?: FormCompositionContentType | null;
  content?: FormCompositionContentProps | null;
  title?: string | null;
  description?: string | null;
  children?: FormCompositionNode[] | null;
  columns?: FormCompositionNode[][] | null;
  domain?: FormCompositionDomainType | null;
};

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
