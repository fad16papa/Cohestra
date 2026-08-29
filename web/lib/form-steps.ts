import type { ActivityFormSchema, FormFieldDefinition, FormFieldStep } from "@/lib/activities-api";

export const FORM_STEP_ORDER: FormFieldStep[] = ["identity", "details", "consent"];

export const formStepLabels: Record<FormFieldStep, string> = {
  identity: "Identity",
  details: "Details",
  consent: "Consent",
};

export function autoBucketField(field: FormFieldDefinition): FormFieldStep {
  if (field.type === "consent") {
    return "consent";
  }

  if (field.type === "phone" || field.type === "email") {
    return "identity";
  }

  const id = field.id.toLowerCase();
  if (
    field.type === "text" &&
    (id === "full_name" || id === "name" || id.includes("full_name"))
  ) {
    return "identity";
  }

  return "details";
}

export function applyMissingStepBuckets(
  schema: ActivityFormSchema
): ActivityFormSchema {
  if (!schema.meta?.splitIntoSteps) {
    return schema;
  }

  return {
    ...schema,
    fields: schema.fields.map((field) => ({
      ...field,
      step: field.step ?? autoBucketField(field),
    })),
  };
}

export function fieldsForStep(
  fields: FormFieldDefinition[],
  step: FormFieldStep
): FormFieldDefinition[] {
  return fields.filter((field) => (field.step ?? autoBucketField(field)) === step);
}

export function usedFormSteps(fields: FormFieldDefinition[]): FormFieldStep[] {
  return FORM_STEP_ORDER.filter((step) => fieldsForStep(fields, step).length > 0);
}
