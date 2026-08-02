import { getCountryName } from "@/lib/countries";

/** Default when phoneCountry is omitted on phone fields (legacy schemas and new fields). */
export const DEFAULT_PHONE_COUNTRY = "SG";

export type PhoneCountryOption = {
  code: string;
  name: string;
  callingCode: string;
};

const CALLING_CODES: Record<string, string> = {
  SG: "65",
  PH: "63",
  MY: "60",
  ID: "62",
  TH: "66",
  VN: "84",
  US: "1",
  GB: "44",
  AU: "61",
  HK: "852",
  JP: "81",
  KR: "82",
  CN: "86",
  IN: "91",
};

const SUPPORTED_PHONE_COUNTRY_CODES = Object.keys(CALLING_CODES);

function buildPhoneCountryOptions(): PhoneCountryOption[] {
  const options = SUPPORTED_PHONE_COUNTRY_CODES.map((code) => ({
    code,
    name: getCountryName(code),
    callingCode: CALLING_CODES[code]!,
  })).sort((left, right) => left.name.localeCompare(right.name));

  const singapore = options.find((option) => option.code === DEFAULT_PHONE_COUNTRY);
  const withoutSingapore = options.filter(
    (option) => option.code !== DEFAULT_PHONE_COUNTRY
  );

  return singapore ? [singapore, ...withoutSingapore] : options;
}

export const phoneCountryOptions: PhoneCountryOption[] = buildPhoneCountryOptions();

export function resolvePhoneCountry(
  phoneCountry: string | null | undefined
): string {
  if (phoneCountry && isSupportedPhoneCountry(phoneCountry)) {
    return phoneCountry.toUpperCase();
  }

  return DEFAULT_PHONE_COUNTRY;
}

export function isSupportedPhoneCountry(code: string): boolean {
  return SUPPORTED_PHONE_COUNTRY_CODES.includes(code.toUpperCase());
}

export function getPhoneCallingCode(countryCode: string | null | undefined): string {
  return CALLING_CODES[resolvePhoneCountry(countryCode)] ?? CALLING_CODES[DEFAULT_PHONE_COUNTRY]!;
}

export function getPhonePlaceholder(countryCode: string | null | undefined): string {
  const code = resolvePhoneCountry(countryCode);
  return code === DEFAULT_PHONE_COUNTRY ? "8123 4567" : "917 123 4567";
}

export function getPhonePrefixLabel(countryCode: string | null | undefined): string {
  return `+${getPhoneCallingCode(countryCode)}`;
}

function extractDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Regional indicator flag emoji from ISO 3166-1 alpha-2 (e.g. SG → 🇸🇬). */
export function isoToFlagEmoji(isoCountryCode: string): string {
  const normalized = isoCountryCode.trim().toUpperCase();
  if (normalized.length !== 2 || !/^[A-Z]{2}$/.test(normalized)) {
    return "🌐";
  }

  return String.fromCodePoint(
    ...[...normalized].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65)
  );
}

/** Infers country from E.164 / stored phone by longest matching calling code. */
export function detectCountryFromE164(phone: string | null | undefined): string {
  const digits = extractDigits(phone ?? "");
  if (!digits) {
    return DEFAULT_PHONE_COUNTRY;
  }

  const matches = Object.entries(CALLING_CODES).sort(
    (left, right) => right[1].length - left[1].length
  );

  for (const [isoCode, callingCode] of matches) {
    if (digits.startsWith(callingCode)) {
      return isoCode;
    }
  }

  return DEFAULT_PHONE_COUNTRY;
}

export type FormattedPhoneDisplay = {
  countryCode: string;
  flag: string;
  prefix: string;
  nationalNumber: string;
  display: string;
};

function formatNationalDigits(nationalDigits: string, countryCode: string): string {
  if (countryCode === DEFAULT_PHONE_COUNTRY && nationalDigits.length === 8) {
    return `${nationalDigits.slice(0, 4)} ${nationalDigits.slice(4)}`;
  }

  if (countryCode === "US" && nationalDigits.length === 10) {
    return `${nationalDigits.slice(0, 3)} ${nationalDigits.slice(3, 6)} ${nationalDigits.slice(6)}`;
  }

  if (countryCode === "PH" && nationalDigits.length === 10) {
    return `${nationalDigits.slice(0, 3)} ${nationalDigits.slice(3, 6)} ${nationalDigits.slice(6)}`;
  }

  return nationalDigits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

/**
 * Full international digits for wa.me links (no + prefix).
 * Local numbers like 93395845 must become 6593395845 — otherwise WhatsApp
 * mis-parses 93 as Afghanistan (+93 395845).
 */
export function toWhatsAppPhoneDigits(
  phone: string | null | undefined
): string | null {
  if (!phone?.trim()) {
    return null;
  }

  const digits = extractDigits(phone);
  if (digits.length < 6) {
    return null;
  }

  const sortedCallingCodes = Object.entries(CALLING_CODES).sort(
    (left, right) => right[1].length - left[1].length
  );

  for (const [, callingCode] of sortedCallingCodes) {
    if (digits.startsWith(callingCode) && digits.length > callingCode.length + 5) {
      return digits;
    }
  }

  let nationalDigits = digits;
  if (nationalDigits.startsWith("0")) {
    nationalDigits = nationalDigits.slice(1);
  }

  if (
    nationalDigits.length === 8 &&
    (nationalDigits[0] === "8" || nationalDigits[0] === "9")
  ) {
    return `${CALLING_CODES[DEFAULT_PHONE_COUNTRY]}${nationalDigits}`;
  }

  if (nationalDigits.length === 10 && nationalDigits[0] === "9") {
    return `${CALLING_CODES.PH}${nationalDigits}`;
  }

  return `${CALLING_CODES[DEFAULT_PHONE_COUNTRY]}${nationalDigits}`;
}

/** Formats stored phone for operator display: flag, +prefix, grouped national number. */
export function formatPhoneDisplay(
  phone: string | null | undefined
): FormattedPhoneDisplay | null {
  if (!phone?.trim()) {
    return null;
  }

  const digits = extractDigits(phone);
  if (digits.length < 6) {
    return null;
  }

  const countryCode = detectCountryFromE164(phone);
  const callingCode = getPhoneCallingCode(countryCode);
  let nationalDigits = digits;

  if (nationalDigits.startsWith(callingCode)) {
    nationalDigits = nationalDigits.slice(callingCode.length);
  }

  if (nationalDigits.startsWith("0")) {
    nationalDigits = nationalDigits.slice(1);
  }

  const nationalNumber = formatNationalDigits(nationalDigits, countryCode);
  const prefix = `+${callingCode}`;

  return {
    countryCode,
    flag: isoToFlagEmoji(countryCode),
    prefix,
    nationalNumber,
    display: `${prefix} ${nationalNumber}`,
  };
}

/** Masks trailing national digits for low-risk previews (e.g. list skim). */
export function maskPhoneNationalNumber(nationalNumber: string): string {
  const parts = nationalNumber.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]} ** **`;
  }

  if (nationalNumber.length <= 4) {
    return "** **";
  }

  return `${nationalNumber.slice(0, 4)} ** **`;
}

export function looksLikePhoneValue(value: string | null | undefined): boolean {
  if (!value?.trim()) {
    return false;
  }

  const trimmed = value.trim();
  return trimmed.startsWith("+") || /^[\d\s()-]{7,}$/.test(trimmed);
}

/** Splits stored E.164 phone into country + local digits for edit forms. */
export function parsePhoneForEdit(phone: string | null | undefined): {
  countryCode: string;
  localNumber: string;
} {
  if (!phone?.trim()) {
    return { countryCode: DEFAULT_PHONE_COUNTRY, localNumber: "" };
  }

  const formatted = formatPhoneDisplay(phone);
  if (formatted) {
    return {
      countryCode: formatted.countryCode,
      localNumber: formatted.nationalNumber.replace(/\s/g, ""),
    };
  }

  return {
    countryCode: detectCountryFromE164(phone),
    localNumber: extractDigits(phone),
  };
}

export function validatePhoneLocalNumber(
  countryCode: string | null | undefined,
  value: unknown,
  required: boolean
): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  if (required && !text) {
    return "This field is required.";
  }

  if (!text) {
    return null;
  }

  let digits = extractDigits(text);
  if (!digits) {
    return getPhoneValidationMessage(countryCode);
  }

  const callingCode = getPhoneCallingCode(countryCode);
  const country = resolvePhoneCountry(countryCode);

  if (digits.startsWith(callingCode)) {
    digits = digits.slice(callingCode.length);
  }

  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (country === DEFAULT_PHONE_COUNTRY) {
    return digits.length === 8 && (digits[0] === "8" || digits[0] === "9")
      ? null
      : "Enter a valid Singapore mobile number.";
  }

  if (country === "PH") {
    return digits.length === 10 && digits[0] === "9"
      ? null
      : "Enter a valid Philippine mobile number.";
  }

  return digits.length >= 6 && digits.length <= 14
    ? null
    : "Enter a valid mobile number.";
}

function getPhoneValidationMessage(countryCode: string | null | undefined): string {
  const country = resolvePhoneCountry(countryCode);
  if (country === DEFAULT_PHONE_COUNTRY) {
    return "Enter a valid Singapore mobile number.";
  }

  if (country === "PH") {
    return "Enter a valid Philippine mobile number.";
  }

  return "Enter a valid mobile number.";
}

export function formatPhoneCountryOptionLabel(option: PhoneCountryOption): string {
  return `${option.name} (+${option.callingCode})`;
}

/** Ensures phone fields always carry a supported country (defaults to SG). */
export function applyPhoneFieldDefaults<T extends { type: string; phoneCountry?: string | null; placeholder?: string | null }>(
  field: T
): T {
  if (field.type !== "phone") {
    return field;
  }

  const phoneCountry = resolvePhoneCountry(field.phoneCountry);

  return {
    ...field,
    phoneCountry,
    placeholder: field.placeholder ?? `${getPhonePrefixLabel(phoneCountry)} …`,
  };
}
