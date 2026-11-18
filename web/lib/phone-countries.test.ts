import { describe, expect, it } from "vitest";

import { filterSearchableOptions } from "@/lib/option-search";
import {
  normalizeLocalPhoneInput,
  parsePhoneForEdit,
  phoneCountryOptions,
  phoneCountrySelectChoices,
  validatePhoneLocalNumber,
} from "@/lib/phone-countries";

const SUPPORTED = [
  "SG",
  "PH",
  "MY",
  "ID",
  "TH",
  "VN",
  "US",
  "GB",
  "AU",
  "HK",
  "JP",
  "KR",
  "CN",
  "IN",
] as const;

describe("phone country dataset", () => {
  it("lists every supported country once, with a flag, name, and prefix", () => {
    expect(phoneCountrySelectChoices.map((choice) => choice.value)).toEqual(
      phoneCountryOptions.map((option) => option.code)
    );
    expect(new Set(phoneCountrySelectChoices.map((choice) => choice.value)).size).toBe(
      SUPPORTED.length
    );

    for (const code of SUPPORTED) {
      const choice = phoneCountrySelectChoices.find((item) => item.value === code);
      expect(choice, code).toBeTruthy();
      expect(choice?.name.length).toBeGreaterThan(0);
      expect(choice?.callingCode).toMatch(/^\d{1,3}$/);
      expect(choice?.flag).not.toBe("🌐");
    }
  });

  it("keeps countries that share a calling code as separate choices", () => {
    const shared = [
      {
        value: "US",
        label: "United States (+1)",
        keywords: "United States US +1 1",
      },
      {
        value: "CA",
        label: "Canada (+1)",
        keywords: "Canada CA +1 1",
      },
    ];

    expect(filterSearchableOptions(shared, "+1").map((item) => item.value)).toEqual([
      "US",
      "CA",
    ]);
    expect(filterSearchableOptions(shared, "canada").map((item) => item.value)).toEqual([
      "CA",
    ]);
  });

  it("searches supported countries by name or prefix", () => {
    expect(
      filterSearchableOptions(phoneCountrySelectChoices, "phil").map((item) => item.value)
    ).toContain("PH");
    expect(
      filterSearchableOptions(phoneCountrySelectChoices, "+63").map((item) => item.value)
    ).toEqual(["PH"]);
    expect(
      filterSearchableOptions(phoneCountrySelectChoices, "852").map((item) => item.value)
    ).toEqual(["HK"]);
  });
});

describe("normalizeLocalPhoneInput", () => {
  it("strips a pasted calling prefix and leaves a national number unchanged", () => {
    expect(normalizeLocalPhoneInput("PH", "+63 917 123 4567")).toBe("9171234567");
    expect(normalizeLocalPhoneInput("PH", "639171234567")).toBe("9171234567");
    expect(normalizeLocalPhoneInput("PH", "9171234567")).toBe("9171234567");
    expect(normalizeLocalPhoneInput("SG", "+65 8123 4567")).toBe("81234567");
    expect(normalizeLocalPhoneInput("SG", "81234567")).toBe("81234567");
  });

  it("does not rewrite a number whose prefix belongs to another country", () => {
    expect(normalizeLocalPhoneInput("PH", "+65 8123 4567")).toBe("+65 8123 4567");
  });

  it("does not strip a short in-progress national number", () => {
    expect(normalizeLocalPhoneInput("PH", "63")).toBe("63");
    expect(normalizeLocalPhoneInput("US", "212555")).toBe("212555");
  });
});

describe("existing phone edit compatibility", () => {
  it("reopens a saved Philippine number on the Philippines without a duplicated prefix", () => {
    const parsed = parsePhoneForEdit("+639171234567");
    expect(parsed.countryCode).toBe("PH");
    expect(parsed.localNumber).toBe("9171234567");
    expect(validatePhoneLocalNumber(parsed.countryCode, parsed.localNumber, false)).toBeNull();
    expect(normalizeLocalPhoneInput(parsed.countryCode, parsed.localNumber)).toBe(
      "9171234567"
    );
  });

  it("reopens a saved Singapore number on Singapore", () => {
    const parsed = parsePhoneForEdit("+6581234567");
    expect(parsed.countryCode).toBe("SG");
    expect(parsed.localNumber).toBe("81234567");
    expect(validatePhoneLocalNumber(parsed.countryCode, parsed.localNumber, false)).toBeNull();
  });
});
