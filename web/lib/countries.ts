export type CountryOption = {
  code: string;
  name: string;
};

/** ISO 3166-1 alpha-2 region codes (excluding deprecated/unassigned where noted). */
const REGION_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU",
  "AW", "AX", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL",
  "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ", "CA", "CC",
  "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV",
  "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG",
  "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD",
  "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT",
  "GU", "GW", "GY", "HK", "HM", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM",
  "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH",
  "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK",
  "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH",
  "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW",
  "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR",
  "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR",
  "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW", "SA", "SB", "SC",
  "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS",
  "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL",
  "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY",
  "UZ", "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WF", "WS", "YE", "YT", "ZA",
  "ZM", "ZW",
] as const;

const FALLBACK_COUNTRIES: CountryOption[] = [
  { code: "PH", name: "Philippines" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
];

function buildCountryList(): CountryOption[] {
  if (typeof Intl === "undefined" || typeof Intl.DisplayNames === "undefined") {
    return FALLBACK_COUNTRIES;
  }

  const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
  const countries = REGION_CODES.map((code) => ({
    code,
    name: displayNames.of(code) ?? code,
  }))
    .filter((country) => country.name !== country.code)
    .sort((left, right) => left.name.localeCompare(right.name));

  const philippines = countries.find((country) => country.code === "PH");
  const withoutPhilippines = countries.filter((country) => country.code !== "PH");

  return philippines
    ? [philippines, ...withoutPhilippines]
    : countries;
}

export const defaultCountryCode = "PH";

export const countries: CountryOption[] = buildCountryList();

const countryNameByCode = new Map(
  countries.map((country) => [country.code, country.name])
);

export function getCountryName(code: string): string {
  if (countryNameByCode.has(code.toUpperCase())) {
    return countryNameByCode.get(code.toUpperCase())!;
  }

  if (typeof Intl !== "undefined" && typeof Intl.DisplayNames !== "undefined") {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    return displayNames.of(code.toUpperCase()) ?? code;
  }

  return code;
}

export function buildActivityLocation(
  locationDetail: string,
  countryCode: string
): string {
  const trimmed = locationDetail.trim();
  const countryName = getCountryName(countryCode);

  if (!trimmed) {
    return countryName;
  }

  if (trimmed.toLowerCase().includes(countryName.toLowerCase())) {
    return trimmed;
  }

  return `${trimmed}, ${countryName}`;
}

export function resolveCountryOption(
  countryCode: string,
  countryName?: string
): CountryOption {
  const normalizedCode = countryCode.toUpperCase();
  const existing = countries.find((country) => country.code === normalizedCode);
  if (existing) {
    return existing;
  }

  return {
    code: normalizedCode,
    name: countryName ?? getCountryName(normalizedCode),
  };
}
