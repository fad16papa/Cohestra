import type { ActivityFormSchema } from "@/lib/activities-api";

/** Stable key for remounting preview when draft schema materially changes. */
export function buildFormStudioPreviewKey(schema: ActivityFormSchema): string {
  return [
    schema.meta?.splitIntoSteps ? "steps" : "page",
    schema.meta?.introMarkdown ?? "",
    schema.meta?.successCopyMarkdown ?? "",
    ...schema.fields.map(
      (field) =>
        `${field.id}:${field.type}:${field.label}:${field.required}:${field.step ?? ""}:${field.visibleWhen?.fieldId ?? ""}:${field.visibleWhen?.equals ?? ""}:${field.visibleWhen?.notEquals ?? ""}:${JSON.stringify(field.options ?? null)}`
    ),
  ].join("|");
}
