import { describe, expect, it } from "vitest";

import {
  assertPaletteExcludesSurveyAndPaymentTypes,
  filterFormFieldPaletteItems,
  formFieldPaletteItems,
  isFormFieldPaletteType,
} from "@/lib/form-field-palette";
import { formFieldTypeOptions } from "@/lib/form-schema-utils";

describe("form-field-palette", () => {
  it("lists nineteen Always toolbox items in toolbox order", () => {
    expect(formFieldPaletteItems).toHaveLength(19);
    expect(formFieldPaletteItems.map((item) => item.label)).toEqual([
      "Text",
      "Long text",
      "Number",
      "Email",
      "Phone",
      "Link",
      "Date",
      "Time",
      "Yes/No",
      "Choice",
      "Dropdown",
      "Multi-choice",
      "Checkbox",
      "Consent",
      "Referral",
      "Country",
      "Section",
      "Info",
      "Hidden",
    ]);
  });

  it("maps every palette type to a supported form field type", () => {
    for (const item of formFieldPaletteItems) {
      expect(formFieldTypeOptions).toContain(item.type);
      expect(isFormFieldPaletteType(item.type)).toBe(true);
    }
  });

  it("excludes survey, payment, and Core+ types from the palette", () => {
    assertPaletteExcludesSurveyAndPaymentTypes();
    const labels = formFieldPaletteItems.map((item) => item.label.toLowerCase());
    expect(labels.some((label) => label.includes("scale"))).toBe(false);
    expect(labels.some((label) => label.includes("emergency"))).toBe(false);
    expect(labels.some((label) => label.includes("nps"))).toBe(false);
    expect(labels.some((label) => label.includes("payment"))).toBe(false);
  });

  it("filters items by label and keywords", () => {
    expect(filterFormFieldPaletteItems("hidden").map((item) => item.type)).toEqual([
      "hidden",
    ]);
    expect(filterFormFieldPaletteItems("dropdown").map((item) => item.type)).toEqual([
      "select",
    ]);
    expect(filterFormFieldPaletteItems("utm").map((item) => item.type)).toEqual([
      "hidden",
    ]);
  });
});
