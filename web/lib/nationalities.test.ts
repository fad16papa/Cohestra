import { describe, expect, it } from "vitest";

import { countries } from "@/lib/countries";
import { nextListboxIndex } from "@/lib/option-search";
import {
  DEMONYM_BY_CODE,
  buildNationalityChoices,
  filterNationalityChoices,
  getStandardNationalityChoices,
} from "@/lib/nationalities";

describe("nationality dataset", () => {
  it("covers every territory in the country list with a unique demonym", () => {
    const missing = countries
      .map((country) => country.code)
      .filter((code) => !DEMONYM_BY_CODE[code]);
    expect(missing).toEqual([]);

    const choices = getStandardNationalityChoices();
    expect(choices.length).toBe(countries.length);
    expect(new Set(choices.map((choice) => choice.value)).size).toBe(choices.length);
    expect(choices.map((choice) => choice.value)).toEqual(
      [...choices.map((choice) => choice.value)].sort((left, right) =>
        left.localeCompare(right, "en")
      )
    );
  });

  it("uses familiar nationality names", () => {
    const labels = getStandardNationalityChoices().map((choice) => choice.value);
    expect(labels).toEqual(
      expect.arrayContaining(["Filipino", "Singaporean", "Australian", "Japanese"])
    );
    expect(DEMONYM_BY_CODE.PH).toBe("Filipino");
    expect(DEMONYM_BY_CODE.US).toBe("American");
    expect(DEMONYM_BY_CODE.GB).toBe("British");
  });

  it("searches by demonym or country name", () => {
    const choices = getStandardNationalityChoices();
    expect(filterNationalityChoices(choices, "filip").map((choice) => choice.value)).toEqual([
      "Filipino",
    ]);
    expect(
      filterNationalityChoices(choices, "philippines").map((choice) => choice.value)
    ).toEqual(["Filipino"]);
    expect(filterNationalityChoices(choices, "japan").map((choice) => choice.value)).toContain(
      "Japanese"
    );
  });
});

describe("legacy nationality values", () => {
  it("keeps an unmatched saved value without rewriting it to a demonym", () => {
    const choices = buildNationalityChoices("Philippines");
    expect(choices[0]).toMatchObject({ value: "Philippines", legacy: true });
    expect(choices.some((choice) => choice.value === "Filipino")).toBe(true);
    expect(choices.filter((choice) => choice.value === "Philippines")).toHaveLength(1);
  });

  it("keeps a combined nationality as one saved value", () => {
    const stored = "Filipino, Singaporean";
    const choices = buildNationalityChoices(stored);
    expect(choices[0]?.value).toBe(stored);
    expect(choices[0]?.legacy).toBe(true);
  });

  it("does not add a legacy row when the saved value is already a demonym", () => {
    const choices = buildNationalityChoices("Filipino");
    expect(choices.some((choice) => choice.legacy)).toBe(false);
    expect(choices.filter((choice) => choice.value === "Filipino")).toHaveLength(1);
  });

  it("preserves differing letter case instead of normalizing it", () => {
    const choices = buildNationalityChoices("filipino");
    expect(choices[0]?.value).toBe("filipino");
    expect(choices.some((choice) => choice.value === "Filipino")).toBe(true);
  });
});

describe("listbox keyboard movement", () => {
  it("moves within the option list and clamps at the ends", () => {
    expect(nextListboxIndex(-1, 3, "ArrowDown")).toBe(0);
    expect(nextListboxIndex(0, 3, "ArrowDown")).toBe(1);
    expect(nextListboxIndex(2, 3, "ArrowDown")).toBe(2);
    expect(nextListboxIndex(0, 3, "ArrowUp")).toBe(0);
    expect(nextListboxIndex(2, 3, "Home")).toBe(0);
    expect(nextListboxIndex(0, 3, "End")).toBe(2);
    expect(nextListboxIndex(0, 0, "ArrowDown")).toBe(-1);
  });
});
