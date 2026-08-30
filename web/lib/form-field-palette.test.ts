import { describe, expect, it } from "vitest";

import {
  assertPaletteExcludesSurveyAndPaymentTypes,
  filterFormFieldPaletteItems,
  formFieldPaletteAlwaysGroup,
  formFieldPaletteItems,
  getFormFieldPaletteGroups,
  isFormFieldPaletteType,
} from "@/lib/form-field-palette";
import { formFieldTypeOptions } from "@/lib/form-schema-utils";
import { getScaleFieldLabel, isScaleFieldValue } from "@/lib/scale-labels";

describe("form-field-palette", () => {
  it("lists nineteen Always toolbox items in toolbox order", () => {
    expect(formFieldPaletteAlwaysGroup.items).toHaveLength(19);
    expect(formFieldPaletteAlwaysGroup.items.map((item) => item.label)).toEqual([
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

  it("includes Core+ scale and emergency items", () => {
    const groups = getFormFieldPaletteGroups(false);
    expect(groups).toHaveLength(2);
    expect(groups[1]?.label).toBe("Core+");
    expect(groups[1]?.items.map((item) => item.type)).toEqual(["scale", "emergency"]);
    expect(formFieldPaletteItems).toHaveLength(21);
  });

  it("marks Core+ palette items locked on Basic", () => {
    const lockedItems = getFormFieldPaletteGroups(true)[1]?.items ?? [];
    expect(lockedItems.every((item) => item.locked)).toBe(true);
    expect(lockedItems[0]?.lockedReason).toMatch(/Core or Pro/i);
  });

  it("maps every palette type to a supported form field type", () => {
    for (const item of formFieldPaletteItems) {
      expect(formFieldTypeOptions).toContain(item.type);
      expect(isFormFieldPaletteType(item.type)).toBe(true);
    }
  });

  it("excludes survey and payment types from the palette", () => {
    assertPaletteExcludesSurveyAndPaymentTypes();
    const labels = formFieldPaletteItems.map((item) => item.label.toLowerCase());
    expect(labels.some((label) => label.includes("nps"))).toBe(false);
    expect(labels.some((label) => label.includes("payment"))).toBe(false);
  });

  it("filters items by label and keywords", () => {
    expect(filterFormFieldPaletteItems("hidden").map((item) => item.type)).toEqual([
      "hidden",
    ]);
    expect(filterFormFieldPaletteItems("scale").map((item) => item.type)).toEqual([
      "scale",
    ]);
    expect(filterFormFieldPaletteItems("dropdown").map((item) => item.type)).toEqual([
      "select",
    ]);
  });
});

describe("scale-labels", () => {
  it("accepts labeled values 1 through 5", () => {
    expect(isScaleFieldValue("3")).toBe(true);
    expect(getScaleFieldLabel("3")).toBe("Intermediate");
    expect(isScaleFieldValue("6")).toBe(false);
  });
});
