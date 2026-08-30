import type { FormFieldType } from "@/lib/activities-api";
import { formFieldTypeLabels } from "@/lib/form-schema-utils";

export type FormFieldPaletteItem = {
  type: FormFieldType;
  label: string;
  keywords: string[];
};

export type FormFieldPaletteGroup = {
  id: string;
  label: string;
  items: FormFieldPaletteItem[];
};

/** Always toolbox — all plans. Order matches form-component-toolbox.md. */
export const formFieldPaletteGroups: FormFieldPaletteGroup[] = [
  {
    id: "always",
    label: "Always",
    items: [
      paletteItem("text", "Text"),
      paletteItem("textarea", "Long text", "long", "notes"),
      paletteItem("number", "Number"),
      paletteItem("email", "Email"),
      paletteItem("phone", "Phone", "mobile"),
      paletteItem("url", "Link", "url", "website"),
      paletteItem("date", "Date"),
      paletteItem("time", "Time"),
      paletteItem("yes_no", "Yes/No", "yes", "no", "boolean"),
      paletteItem("choice", "Choice"),
      paletteItem("select", "Dropdown", "select", "dropdown"),
      paletteItem("multi_choice", "Multi-choice", "multi", "checkboxes"),
      paletteItem("checkbox", "Checkbox"),
      paletteItem("consent", "Consent"),
      paletteItem("referral_source", "Referral", "referral", "source", "attribution"),
      paletteItem("country", "Country", "nationality"),
      paletteItem("section_header", "Section", "section", "header", "divider"),
      paletteItem("info", "Info", "instructions", "note"),
      paletteItem("hidden", "Hidden", "utm", "campaign", "ref"),
    ],
  },
];

export const formFieldPaletteItems: FormFieldPaletteItem[] =
  formFieldPaletteGroups.flatMap((group) => group.items);

const excludedPaletteTypes = new Set<string>([
  "scale",
  "emergency",
  "nps",
  "csat",
  "ranking",
  "matrix",
  "payment",
]);

export function isFormFieldPaletteType(type: string): type is FormFieldType {
  return formFieldPaletteItems.some((item) => item.type === type);
}

export function assertPaletteExcludesSurveyAndPaymentTypes(): void {
  for (const type of excludedPaletteTypes) {
    if (formFieldPaletteItems.some((item) => item.type === type)) {
      throw new Error(`Palette must not include ${type}`);
    }
  }
}

export function filterFormFieldPaletteItems(
  query: string,
  groups: FormFieldPaletteGroup[] = formFieldPaletteGroups
): FormFieldPaletteItem[] {
  const normalized = query.trim().toLowerCase();
  const items = groups.flatMap((group) => group.items);

  if (!normalized) {
    return items;
  }

  return items.filter((item) => {
    if (item.label.toLowerCase().includes(normalized)) {
      return true;
    }

    if (item.type.toLowerCase().includes(normalized)) {
      return true;
    }

    return item.keywords.some((keyword) => keyword.includes(normalized));
  });
}

function paletteItem(
  type: FormFieldType,
  label: string,
  ...keywords: string[]
): FormFieldPaletteItem {
  return {
    type,
    label,
    keywords: [
      label.toLowerCase(),
      formFieldTypeLabels[type].toLowerCase(),
      type.replace(/_/g, " "),
      type,
      ...keywords.map((keyword) => keyword.toLowerCase()),
    ],
  };
}
