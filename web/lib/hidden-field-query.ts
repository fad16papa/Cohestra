import type { FormFieldDefinition } from "@/lib/activities-api";
import { isHiddenFieldType } from "@/lib/form-schema-utils";

type QueryLookup = {
  get(name: string): string | null;
};

export function collectHiddenAnswers(
  fields: FormFieldDefinition[],
  searchParams: QueryLookup
): Record<string, string> {
  const answers: Record<string, string> = {};

  for (const field of fields) {
    if (!isHiddenFieldType(field.type)) {
      continue;
    }

    const fromQuery = searchParams.get(field.id)?.trim() ?? "";
    if (fromQuery) {
      answers[field.id] = fromQuery;
      continue;
    }

    const fallback = field.defaultValue?.trim() ?? "";
    if (fallback) {
      answers[field.id] = fallback;
    }
  }

  return answers;
}
