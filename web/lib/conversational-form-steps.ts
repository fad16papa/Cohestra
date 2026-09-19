import type { FormFieldDefinition } from "@/lib/activities-api";
import { isHiddenFieldType, isNonInputFieldType } from "@/lib/form-schema-utils";
import { isFieldVisible } from "@/lib/form-visibility";

/** Visible registration fields in schema order for conversational flow (excludes hidden on public). */
export function listConversationalSteps(
  fields: FormFieldDefinition[],
  values: Record<string, unknown>,
  options: { includeHiddenPreview: boolean }
): FormFieldDefinition[] {
  return fields.filter((field) => {
    if (!isFieldVisible(field, values, fields)) {
      return false;
    }

    if (isHiddenFieldType(field.type)) {
      return options.includeHiddenPreview;
    }

    return true;
  });
}

export function isConversationalDisplayOnlyStep(field: FormFieldDefinition): boolean {
  return isNonInputFieldType(field.type);
}

export function clampConversationalStepIndex(
  index: number,
  stepCount: number
): number {
  if (stepCount <= 0) {
    return 0;
  }

  return Math.min(Math.max(0, index), stepCount - 1);
}
