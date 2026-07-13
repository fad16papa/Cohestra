import type {
  ActivityFormSchema,
  FormFieldDefinition,
  FormFieldType,
} from "@/lib/activities-api";
import {
  applyPhoneFieldDefaults,
  DEFAULT_PHONE_COUNTRY,
  isSupportedPhoneCountry,
} from "@/lib/phone-countries";

export const formFieldTypeLabels: Record<FormFieldType, string> = {
  text: "Text",
  phone: "Phone",
  email: "Email",
  select: "Select",
  checkbox: "Checkbox",
  consent: "Consent",
  referral_source: "Referral source",
};

export const formFieldTypeOptions: FormFieldType[] = [
  "text",
  "phone",
  "email",
  "select",
  "checkbox",
  "consent",
  "referral_source",
];

export function emptyFormSchema(): ActivityFormSchema {
  return { version: 1, fields: [] };
}

export function normalizeFormSchema(
  schema: ActivityFormSchema | null | undefined
): ActivityFormSchema {
  if (!schema) {
    return emptyFormSchema();
  }

  return {
    version: schema.version,
    fields: schema.fields.map((field) => applyPhoneFieldDefaults({ ...field })),
  };
}

export function createFieldId(type: FormFieldType, existingIds: Set<string>): string {
  const base = type === "referral_source" ? "referral" : type.replace("_", "-");
  let candidate = base;
  let suffix = 2;

  while (existingIds.has(candidate)) {
    candidate = `${base}-${suffix++}`;
  }

  return candidate;
}

export function createDefaultField(
  type: FormFieldType,
  existingIds: Set<string>
): FormFieldDefinition {
  const id = createFieldId(type, existingIds);

  const defaults: Record<FormFieldType, Omit<FormFieldDefinition, "id" | "type">> = {
    text: {
      label: "Text field",
      required: false,
      placeholder: null,
      options: null,
      consentText: null,
      phoneCountry: null,
    },
    phone: {
      label: "Mobile number",
      required: true,
      placeholder: "+65 …",
      options: null,
      consentText: null,
      phoneCountry: DEFAULT_PHONE_COUNTRY,
    },
    email: {
      label: "Email address",
      required: true,
      placeholder: "you@example.com",
      options: null,
      consentText: null,
      phoneCountry: null,
    },
    select: {
      label: "Select one",
      required: false,
      placeholder: null,
      options: [
        { value: "option_a", label: "Option A" },
        { value: "option_b", label: "Option B" },
      ],
      consentText: null,
      phoneCountry: null,
    },
    checkbox: {
      label: "Opt in",
      required: false,
      placeholder: null,
      options: null,
      consentText: null,
      phoneCountry: null,
    },
    consent: {
      label: "Consent",
      required: true,
      placeholder: null,
      options: null,
      consentText: "I agree to be contacted about this activity.",
      phoneCountry: null,
    },
    referral_source: {
      label: "How did you hear about us?",
      required: false,
      placeholder: null,
      options: [
        { value: "friend", label: "Friend" },
        { value: "social", label: "Social media" },
      ],
      consentText: null,
      phoneCountry: null,
    },
  };

  return {
    id,
    type,
    ...defaults[type],
  };
}

export function reorderFields(
  fields: FormFieldDefinition[],
  fromIndex: number,
  toIndex: number
): FormFieldDefinition[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= fields.length ||
    toIndex >= fields.length
  ) {
    return fields;
  }

  const next = [...fields];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function moveField(
  fields: FormFieldDefinition[],
  index: number,
  direction: -1 | 1
): FormFieldDefinition[] {
  return reorderFields(fields, index, index + direction);
}

export function fieldNeedsOptions(type: FormFieldType): boolean {
  return type === "select" || type === "referral_source";
}

export function fieldNeedsConsentText(type: FormFieldType): boolean {
  return type === "consent";
}

const FIELD_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export function isValidFieldId(id: string): boolean {
  return FIELD_ID_PATTERN.test(id.trim());
}

export function getDuplicateFieldIds(
  fields: FormFieldDefinition[]
): Set<string> {
  const counts = new Map<string, number>();

  for (const field of fields) {
    counts.set(field.id, (counts.get(field.id) ?? 0) + 1);
  }

  return new Set(
    [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([id]) => id)
  );
}

export function getFormSchemaClientIssues(
  schema: ActivityFormSchema
): string[] {
  const issues: string[] = [];
  const duplicateIds = getDuplicateFieldIds(schema.fields);
  const reportedDuplicateIds = new Set<string>();

  for (const field of schema.fields) {
    if (!field.id.trim()) {
      issues.push(`Field "${field.label}" is missing a field ID.`);
      continue;
    }

    if (!isValidFieldId(field.id)) {
      issues.push(
        `Field ID "${field.id}" must use lowercase letters, numbers, underscores, or hyphens.`
      );
    }

    if (duplicateIds.has(field.id) && !reportedDuplicateIds.has(field.id)) {
      reportedDuplicateIds.add(field.id);
      issues.push(`Field ID "${field.id}" is used more than once.`);
    }

    if (fieldNeedsConsentText(field.type) && !field.consentText?.trim()) {
      issues.push(`Consent field "${field.label}" requires consent text.`);
    }

    if (field.type === "phone") {
      if (!field.phoneCountry?.trim()) {
        issues.push(`Phone field "${field.label}" requires a mobile country.`);
      } else if (!isSupportedPhoneCountry(field.phoneCountry)) {
        issues.push(
          `Phone field "${field.label}" uses an unsupported country code.`
        );
      }
    }
  }

  return [...new Set(issues)];
}

export const publishGateSavedFormNote =
  "Publish requirements use the last saved form. Save the Form tab before publishing.";

export function getPublishGateIssues(
  schema: ActivityFormSchema | null | undefined
): string[] {
  const normalized = normalizeFormSchema(schema);
  const issues: string[] = [];

  if (normalized.fields.length === 0) {
    issues.push(
      "Configure the registration form before publishing. Add at least one required phone or email field."
    );
    return issues;
  }

  const clientIssues = getFormSchemaClientIssues(normalized);
  for (const issue of clientIssues) {
    issues.push(`Fix the form schema before publishing: ${issue}`);
  }

  const hasRequiredContactField = normalized.fields.some(
    (field) =>
      field.required && (field.type === "phone" || field.type === "email")
  );

  if (!hasRequiredContactField) {
    issues.push(
      "Add at least one required phone or email field before publishing."
    );
  }

  if (
    normalized.fields.some(
      (field) => field.type === "consent" && !field.required
    )
  ) {
    issues.push("Consent fields must be marked required before publishing.");
  }

  return [...new Set(issues)];
}
