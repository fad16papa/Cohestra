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
import { collectVisibleWhenIssues } from "@/lib/form-visibility";

export const formFieldTypeLabels: Record<FormFieldType, string> = {
  text: "Text",
  textarea: "Long text",
  date: "Date",
  phone: "Phone",
  email: "Email",
  select: "Select",
  checkbox: "Checkbox",
  consent: "Consent",
  referral_source: "Referral source",
  section_header: "Section header",
  hidden: "Hidden",
  number: "Number",
  url: "Link",
  time: "Time",
  choice: "Choice",
  yes_no: "Yes / No",
  multi_choice: "Multi-choice",
  info: "Info",
  country: "Country",
  scale: "Scale",
  emergency: "Emergency contact",
};

export const formFieldTypeOptions: FormFieldType[] = [
  "text",
  "textarea",
  "date",
  "number",
  "url",
  "time",
  "choice",
  "yes_no",
  "multi_choice",
  "phone",
  "email",
  "select",
  "checkbox",
  "consent",
  "referral_source",
  "country",
  "section_header",
  "info",
  "hidden",
  "scale",
  "emergency",
];

export function emptyFormSchema(): ActivityFormSchema {
  return { version: 1, meta: null, fields: [] };
}

export function normalizeFormSchema(
  schema: ActivityFormSchema | null | undefined
): ActivityFormSchema {
  if (!schema) {
    return emptyFormSchema();
  }

  return {
    version: schema.version,
    meta: schema.meta ?? null,
    fields: schema.fields.map((field) => applyPhoneFieldDefaults({ ...field })),
  };
}

export function createFieldId(type: FormFieldType, existingIds: Set<string>): string {
  if (type === "hidden" && !existingIds.has("ref")) {
    return "ref";
  }

  if (type === "textarea" && !existingIds.has("notes")) {
    return "notes";
  }

  if (type === "date" && !existingIds.has("date")) {
    return "date";
  }

  if (
    (type === "number" ||
      type === "url" ||
      type === "time" ||
      type === "choice" ||
      type === "yes_no" ||
      type === "multi_choice" ||
      type === "info" ||
      type === "country" ||
      type === "scale" ||
      type === "emergency") &&
    !existingIds.has(type)
  ) {
    return type;
  }

  const base =
    type === "referral_source"
      ? "referral"
      : type === "hidden"
        ? "hidden"
        : type === "textarea"
          ? "notes"
          : type;
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
    textarea: {
      label: "Notes",
      required: false,
      placeholder: null,
      options: null,
      consentText: null,
      phoneCountry: null,
    },
    date: {
      label: "Date",
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
    section_header: {
      label: "Section title",
      required: false,
      placeholder: null,
      options: null,
      consentText: null,
      phoneCountry: null,
    },
    hidden: {
      label: "Campaign ref",
      required: false,
      placeholder: null,
      options: null,
      consentText: null,
      phoneCountry: null,
      defaultValue: null,
    },
    number: {
      label: "Number",
      required: false,
      placeholder: null,
      options: null,
      consentText: null,
      phoneCountry: null,
      min: null,
      max: null,
    },
    url: {
      label: "Website",
      required: false,
      placeholder: "https://",
      options: null,
      consentText: null,
      phoneCountry: null,
    },
    time: {
      label: "Time",
      required: false,
      placeholder: null,
      options: null,
      consentText: null,
      phoneCountry: null,
    },
    choice: {
      label: "Choose one",
      required: false,
      placeholder: null,
      options: [
        { value: "option_a", label: "Option A" },
        { value: "option_b", label: "Option B" },
      ],
      consentText: null,
      phoneCountry: null,
    },
    yes_no: {
      label: "Yes or no",
      required: false,
      placeholder: null,
      options: null,
      consentText: null,
      phoneCountry: null,
    },
    multi_choice: {
      label: "Choose any",
      required: false,
      placeholder: null,
      options: [
        { value: "option_a", label: "Option A" },
        { value: "option_b", label: "Option B" },
      ],
      consentText: null,
      phoneCountry: null,
      min: null,
      max: null,
    },
    info: {
      label: "Information",
      required: false,
      placeholder: null,
      options: null,
      consentText: null,
      phoneCountry: null,
      infoText: "Add a short note for participants.",
    },
    country: {
      label: "Country",
      required: false,
      placeholder: null,
      options: null,
      consentText: null,
      phoneCountry: null,
    },
    scale: {
      label: "Skill level",
      required: false,
      placeholder: null,
      options: null,
      consentText: null,
      phoneCountry: null,
    },
    emergency: {
      label: "Emergency contact",
      required: false,
      placeholder: null,
      options: null,
      consentText: null,
      phoneCountry: DEFAULT_PHONE_COUNTRY,
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
  return (
    type === "select" ||
    type === "referral_source" ||
    type === "choice" ||
    type === "multi_choice"
  );
}

export function fieldNeedsConsentText(type: FormFieldType): boolean {
  return type === "consent";
}

export function isCorePlusFieldType(type: FormFieldType): boolean {
  return type === "scale" || type === "emergency";
}

export function isNonInputFieldType(type: FormFieldType): boolean {
  return type === "section_header" || type === "info";
}

export function fieldAllowsMinMax(type: FormFieldType): boolean {
  return type === "number" || type === "multi_choice";
}

export function fieldNeedsInfoText(type: FormFieldType): boolean {
  return type === "info";
}

export function isHiddenFieldType(type: FormFieldType): boolean {
  return type === "hidden";
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

    if (!isHiddenFieldType(field.type) && field.defaultValue?.trim()) {
      issues.push(`Field "${field.label || field.id}" cannot have a default value.`);
    }

    if (field.type !== "info" && field.infoText?.trim()) {
      issues.push(`Field "${field.label || field.id}" cannot have info text.`);
    }

    if (isNonInputFieldType(field.type)) {
      if (field.required) {
        issues.push(
          field.type === "info"
            ? `Info field "${field.label}" cannot be marked required.`
            : `Section header "${field.label}" cannot be marked required.`
        );
      }

      if (field.placeholder?.trim()) {
        issues.push(
          field.type === "info"
            ? `Info field "${field.label}" cannot have a placeholder.`
            : `Section header "${field.label}" cannot have a placeholder.`
        );
      }

      if (!field.label.trim()) {
        issues.push(
          field.type === "info"
            ? `Info field "${field.id}" requires a heading label.`
            : `Section header "${field.id}" requires a heading label.`
        );
      }

      if (field.type === "info" && (field.infoText?.trim().length ?? 0) > 2000) {
        issues.push(`Info field "${field.label}" cannot exceed 2000 characters.`);
      }

      continue;
    }

    if (isHiddenFieldType(field.type)) {
      if (field.placeholder?.trim()) {
        issues.push(`Hidden field "${field.label}" cannot have a placeholder.`);
      }

      if (field.options?.length) {
        issues.push(`Hidden field "${field.label}" cannot have options.`);
      }

      if (field.phoneCountry?.trim()) {
        issues.push(`Hidden field "${field.label}" cannot have a phone country.`);
      }

      if (field.consentText?.trim()) {
        issues.push(`Hidden field "${field.label}" cannot have consent text.`);
      }

      if ((field.defaultValue?.trim().length ?? 0) > 200) {
        issues.push(`Hidden field "${field.label}" default value cannot exceed 200 characters.`);
      }
    }

    if (!fieldAllowsMinMax(field.type) && (field.min != null || field.max != null)) {
      issues.push(`Field "${field.label || field.id}" cannot have min or max.`);
    }

    if (
      fieldAllowsMinMax(field.type) &&
      field.min != null &&
      field.max != null &&
      field.min > field.max
    ) {
      issues.push(`Field "${field.label || field.id}" min cannot be greater than max.`);
    }

    if (
      field.type === "multi_choice" &&
      field.min != null &&
      field.min > (field.options?.length ?? 0)
    ) {
      issues.push(
        `Field "${field.label || field.id}" min cannot exceed the number of options.`
      );
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

  issues.push(...collectVisibleWhenIssues(schema.fields));

  return [...new Set(issues)];
}

export const publishGateSavedFormNote =
  "Publish requirements use the last saved form. Save the Form tab before publishing.";

const ACTIVITY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ACTIVITY_SLUG_MAX_LENGTH = 220;

export function isValidActivitySlug(slug: string | null | undefined): boolean {
  if (!slug || slug.length > ACTIVITY_SLUG_MAX_LENGTH) {
    return false;
  }

  return ACTIVITY_SLUG_PATTERN.test(slug);
}

export function getPublishGateIssues(
  schema: ActivityFormSchema | null | undefined,
  options?: { slug?: string | null }
): string[] {
  const normalized = normalizeFormSchema(schema);
  const issues: string[] = [];

  if (!isValidActivitySlug(options?.slug?.trim())) {
    issues.push(
      "A valid registration slug is required before publishing. Create or rename the activity so a slug can be assigned."
    );
  }

  if (normalized.fields.length === 0) {
    issues.push(
      "Configure the registration form before publishing. Add at least one required phone or email field."
    );
    return [...new Set(issues)];
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
