import type { ActivityFormSchema, FormFieldDefinition } from "@/lib/activities-api";

export const PIPING_SAMPLE_NAME = "Maya";
export const PIPING_SAMPLE_EMAIL = "maya@example.com";
export const PIPING_SAMPLE_PHONE = "+65 9123 4567";

const PARTICIPANT_TOKEN_PATTERN =
  /\{\{(full_name|email|phone)\}\}|\{\{field:([a-z0-9][a-z0-9_-]{0,63})\}\}/gi;

const UNKNOWN_TOKEN_PATTERN = /\{\{[^}]*\}\}/g;
const UNCLOSED_TOKEN_PATTERN = /\{\{[^}\n]*/g;

const NON_INPUT_FIELD_TYPES = new Set(["section_header", "info"]);
const HIDDEN_FIELD_TYPE = "hidden";

export function isPipingEligibleField(field: FormFieldDefinition): boolean {
  return field.type !== HIDDEN_FIELD_TYPE && !NON_INPUT_FIELD_TYPES.has(field.type);
}

export function listPipingFieldTokens(schema: ActivityFormSchema): string[] {
  return schema.fields.filter(isPipingEligibleField).map((field) => `{{field:${field.id}}}`);
}

export function normalizeParticipantCopyLineEndings(text: string): string {
  return text.replace(/\r\n?/g, "\n").replace(/\u2028|\u2029/g, "\n");
}

export function splitParticipantCopyParagraphs(text: string): string[] {
  const normalized = normalizeParticipantCopyLineEndings(text.trim());
  if (!normalized) {
    return [];
  }

  return normalized
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function findFieldById(schema: ActivityFormSchema, fieldId: string): FormFieldDefinition | undefined {
  const normalized = fieldId.toLowerCase();
  return schema.fields.find((item) => item.id.toLowerCase() === normalized);
}

export function substitutePipingPreview(
  template: string | null | undefined,
  schema: ActivityFormSchema
): string {
  if (!template?.trim()) {
    return "";
  }

  const sampleFieldValues = new Map(
    schema.fields
      .filter(isPipingEligibleField)
      .map((field) => [field.id.toLowerCase(), field.label.trim() || field.id])
  );

  const substituted = template.replace(
    PARTICIPANT_TOKEN_PATTERN,
    (_match, token?: string, fieldId?: string) => {
      if (token) {
        const normalized = token.toLowerCase();
        if (normalized === "full_name") {
          return PIPING_SAMPLE_NAME;
        }
        if (normalized === "email") {
          return PIPING_SAMPLE_EMAIL;
        }
        if (normalized === "phone") {
          return PIPING_SAMPLE_PHONE;
        }
      }
      if (fieldId) {
        const field = findFieldById(schema, fieldId);
        if (!field || !isPipingEligibleField(field)) {
          return "";
        }
        return sampleFieldValues.get(fieldId.toLowerCase()) ?? "";
      }
      return "";
    }
  );

  return substituted
    .replace(UNKNOWN_TOKEN_PATTERN, "")
    .replace(UNCLOSED_TOKEN_PATTERN, "");
}

function formatAnswerForPiping(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "object" && value !== null && "phone" in value) {
    const phone = value as { phone?: unknown; country?: unknown };
    const local = typeof phone.phone === "string" ? phone.phone.trim() : "";
    const country = typeof phone.country === "string" ? phone.country.trim() : "";
    return [country, local].filter(Boolean).join(" ").trim();
  }

  return "";
}

function findAnswerByFieldId(
  answers: Record<string, unknown>,
  fieldId: string
): unknown {
  if (fieldId in answers) {
    return answers[fieldId];
  }

  const normalized = fieldId.toLowerCase();
  const match = Object.entries(answers).find(
    ([key]) => key.toLowerCase() === normalized
  );
  return match?.[1];
}

/** Substitute participant tokens using preview form answers (Studio simulated submit). */
export function substitutePipingAnswers(
  template: string | null | undefined,
  schema: ActivityFormSchema,
  answers: Record<string, unknown>
): string {
  if (!template?.trim()) {
    return "";
  }

  const substituted = template.replace(
    PARTICIPANT_TOKEN_PATTERN,
    (_match, token?: string, fieldId?: string) => {
      if (token) {
        const normalized = token.toLowerCase();
        if (normalized === "full_name") {
          const direct =
            formatAnswerForPiping(findAnswerByFieldId(answers, "full_name")) ||
            formatAnswerForPiping(findAnswerByFieldId(answers, "name"));
          return direct || PIPING_SAMPLE_NAME;
        }
        if (normalized === "email") {
          const direct = formatAnswerForPiping(findAnswerByFieldId(answers, "email"));
          return direct || PIPING_SAMPLE_EMAIL;
        }
        if (normalized === "phone") {
          const direct = formatAnswerForPiping(findAnswerByFieldId(answers, "phone"));
          return direct || PIPING_SAMPLE_PHONE;
        }
      }
      if (fieldId) {
        const field = findFieldById(schema, fieldId);
        if (!field || !isPipingEligibleField(field)) {
          return "";
        }
        return formatAnswerForPiping(findAnswerByFieldId(answers, fieldId));
      }
      return "";
    }
  );

  return substituted
    .replace(UNKNOWN_TOKEN_PATTERN, "")
    .replace(UNCLOSED_TOKEN_PATTERN, "");
}
