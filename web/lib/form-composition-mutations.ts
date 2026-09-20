import type {
  ActivityFormSchema,
  FormCompositionNode,
  FormFieldDefinition,
  FormFieldType,
} from "@/lib/activities-api";
import {
  createDefaultField,
  isHiddenFieldType,
} from "@/lib/form-schema-utils";
import {
  FORM_SCHEMA_VERSION_V2,
  getEffectiveComposition,
  hasStoredComposition,
  synthesizeLinearComposition,
} from "@/lib/form-composition";
import { autoBucketField } from "@/lib/form-steps";

export function compositionBlockIdForField(fieldId: string): string {
  return `field-ref-${fieldId}`;
}

export function ensureBuilderEditableSchema(
  schema: ActivityFormSchema
): ActivityFormSchema {
  if (
    schema.version === FORM_SCHEMA_VERSION_V2 &&
    hasStoredComposition(schema.composition)
  ) {
    return schema;
  }

  return {
    ...schema,
    version: FORM_SCHEMA_VERSION_V2,
    composition: synthesizeLinearComposition(schema.fields),
  };
}

export function getCanvasComposition(
  schema: ActivityFormSchema
): FormCompositionNode[] {
  return getEffectiveComposition(schema.fields, schema.composition ?? null).filter(
    (node) => node.kind === "fieldRef"
  );
}

export function addInputFieldBlock(
  schema: ActivityFormSchema,
  type: FormFieldType,
  options?: { stepsEnabled?: boolean }
): ActivityFormSchema {
  const base = ensureBuilderEditableSchema(schema);
  const fieldIds = new Set(base.fields.map((field) => field.id));
  const field = createDefaultField(type, fieldIds);
  if (options?.stepsEnabled) {
    field.step = autoBucketField(field);
  }

  const composition = [...(base.composition ?? [])];
  composition.push({
    id: compositionBlockIdForField(field.id),
    kind: "fieldRef",
    fieldId: field.id,
  });

  return {
    ...base,
    fields: [...base.fields, field],
    composition,
  };
}

export function removeFieldRefBlock(
  schema: ActivityFormSchema,
  blockId: string
): ActivityFormSchema {
  const base = ensureBuilderEditableSchema(schema);
  const target = (base.composition ?? []).find((node) => node.id === blockId);
  if (!target || target.kind !== "fieldRef" || !target.fieldId) {
    return base;
  }

  const fieldId = target.fieldId;
  return {
    ...base,
    fields: base.fields.filter((field) => field.id !== fieldId),
    composition: (base.composition ?? []).filter((node) => node.id !== blockId),
  };
}

export function reorderCompositionBlocks(
  schema: ActivityFormSchema,
  fromCanvasIndex: number,
  toCanvasIndex: number
): ActivityFormSchema {
  const base = ensureBuilderEditableSchema(schema);
  const composition = [...(base.composition ?? [])];
  const fieldRefSlotIndexes: number[] = [];

  composition.forEach((node, index) => {
    if (node.kind === "fieldRef") {
      fieldRefSlotIndexes.push(index);
    }
  });

  if (
    fromCanvasIndex < 0 ||
    toCanvasIndex < 0 ||
    fromCanvasIndex >= fieldRefSlotIndexes.length ||
    toCanvasIndex >= fieldRefSlotIndexes.length ||
    fromCanvasIndex === toCanvasIndex
  ) {
    return base;
  }

  const fieldRefNodes = fieldRefSlotIndexes.map((index) => composition[index]!);
  const [moved] = fieldRefNodes.splice(fromCanvasIndex, 1);
  fieldRefNodes.splice(toCanvasIndex, 0, moved!);
  fieldRefSlotIndexes.forEach((slotIndex, refIndex) => {
    composition[slotIndex] = fieldRefNodes[refIndex]!;
  });

  return {
    ...base,
    composition,
  };
}

export function syncCompositionAfterFieldIdChange(
  schema: ActivityFormSchema,
  previousFieldId: string,
  nextFieldId: string
): ActivityFormSchema {
  if (previousFieldId === nextFieldId || !nextFieldId.trim()) {
    return schema;
  }

  const fieldsWithNextId = schema.fields.filter(
    (field) => field.id === nextFieldId
  ).length;
  if (fieldsWithNextId !== 1) {
    return schema;
  }

  const base = ensureBuilderEditableSchema(schema);
  const composition = (base.composition ?? []).map((node) => {
    if (node.kind !== "fieldRef" || node.fieldId !== previousFieldId) {
      return node;
    }

    return {
      ...node,
      id: compositionBlockIdForField(nextFieldId),
      fieldId: nextFieldId,
    };
  });

  const fields = base.fields.map((field) => {
    if (field.visibleWhen?.fieldId !== previousFieldId) {
      return field;
    }

    return {
      ...field,
      visibleWhen: {
        ...field.visibleWhen,
        fieldId: nextFieldId,
      },
    };
  });

  return {
    ...base,
    fields,
    composition,
  };
}

export function compositionBlockIdAfterFieldRename(
  previousFieldId: string,
  nextFieldId: string
): { previousBlockId: string; nextBlockId: string } {
  return {
    previousBlockId: compositionBlockIdForField(previousFieldId),
    nextBlockId: compositionBlockIdForField(nextFieldId),
  };
}

export function findFieldIndexByBlockId(
  schema: ActivityFormSchema,
  blockId: string | null
): number | null {
  if (!blockId) {
    return null;
  }

  const node = (schema.composition ?? getCanvasComposition(schema)).find(
    (entry) => entry.id === blockId
  );
  if (!node?.fieldId) {
    return null;
  }

  const index = schema.fields.findIndex((field) => field.id === node.fieldId);
  return index >= 0 ? index : null;
}

export function updateFieldAtIndex(
  schema: ActivityFormSchema,
  index: number,
  patch: Partial<FormFieldDefinition>
): ActivityFormSchema {
  const fields = schema.fields.map((field, fieldIndex) =>
    fieldIndex === index ? { ...field, ...patch } : field
  );
  return { ...schema, fields };
}

/** Palette types for Story 36.2 — input fields only. */
export const BUILDER_INPUT_FIELD_TYPES: FormFieldType[] = [
  "text",
  "textarea",
  "email",
  "phone",
  "number",
  "select",
  "choice",
  "multi_choice",
  "checkbox",
  "date",
  "consent",
  "yes_no",
  "url",
  "time",
  "referral_source",
  "country",
  "scale",
  "emergency",
];

export function isBuilderPaletteType(type: FormFieldType): boolean {
  return (
    BUILDER_INPUT_FIELD_TYPES.includes(type) && !isHiddenFieldType(type)
  );
}
