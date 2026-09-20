import type {
  ActivityFormSchema,
  FormCompositionNode,
  FormFieldDefinition,
} from "@/lib/activities-api";
import {
  FORM_SCHEMA_VERSION_V2,
  getEffectiveComposition,
  hasStoredComposition,
} from "@/lib/form-composition";

/** Depth-first fieldRef order across sections (presentation nodes skipped). */
export function flattenFieldRefOrder(
  composition: ActivityFormSchema["composition"]
): string[] {
  if (!composition?.length) {
    return [];
  }

  const fieldIds: string[] = [];

  function walk(nodes: FormCompositionNode[]): void {
    for (const node of nodes) {
      if (node.kind === "fieldRef" && node.fieldId?.trim()) {
        fieldIds.push(node.fieldId.trim());
      } else if (node.kind === "section" && node.children?.length) {
        walk(node.children);
      }
    }
  }

  walk(composition);
  return fieldIds;
}

export function orderFieldsByComposition(
  fields: FormFieldDefinition[],
  composition: ActivityFormSchema["composition"],
  version: number
): FormFieldDefinition[] {
  const effective =
    version === FORM_SCHEMA_VERSION_V2 && hasStoredComposition(composition)
      ? composition!
      : getEffectiveComposition(fields, composition);

  const order = flattenFieldRefOrder(effective);
  if (order.length === 0) {
    return fields;
  }

  const byId = new Map(fields.map((field) => [field.id, field]));
  const ordered: FormFieldDefinition[] = [];
  const seen = new Set<string>();

  for (const fieldId of order) {
    const field = byId.get(fieldId);
    if (field && !seen.has(fieldId)) {
      ordered.push(field);
      seen.add(fieldId);
    }
  }

  for (const field of fields) {
    if (!seen.has(field.id)) {
      ordered.push(field);
    }
  }

  return ordered;
}
