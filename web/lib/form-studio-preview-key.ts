import type { ActivityFormSchema, RegistrationTheme } from "@/lib/activities-api";
import { buildCompositionPreviewFingerprint } from "@/lib/form-composition-preview-fingerprint";
import { buildExperiencePreviewKey } from "@/lib/registration-experience-studio";

/** Stable key for remounting preview when draft schema materially changes. */
export function buildFormStudioPreviewKey(
  schema: ActivityFormSchema,
  theme?: RegistrationTheme | null
): string {
  const experiencePart = theme ? buildExperiencePreviewKey(theme) : "";
  const compositionFingerprint = buildCompositionPreviewFingerprint(
    schema.fields,
    schema.composition ?? null
  );

  return [
    experiencePart,
    schema.meta?.splitIntoSteps ? "steps" : "page",
    schema.meta?.introMarkdown ?? "",
    schema.meta?.successCopyMarkdown ?? "",
    `composition:${compositionFingerprint}`,
    ...schema.fields.map(
      (field) =>
        `${field.id}:${field.type}:${field.label}:${field.required}:${field.step ?? ""}:${field.visibleWhen?.fieldId ?? ""}:${field.visibleWhen?.equals ?? ""}:${field.visibleWhen?.notEquals ?? ""}:${JSON.stringify(field.options ?? null)}`
    ),
  ].join("|");
}
