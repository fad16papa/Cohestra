import { countries } from "@/lib/countries";

import {
  filterSearchableOptions,
  type SearchableOption,
} from "@/lib/option-search";

/**
 * Familiar English demonyms for the same territories as `countries`.
 * The saved master-profile value remains this label (a single string), not an ISO code.
 */
export const DEMONYM_BY_CODE: Record<string, string> = {
  AD: "Andorran",
  AE: "Emirati",
  AF: "Afghan",
  AG: "Antiguan",
  AI: "Anguillian",
  AL: "Albanian",
  AM: "Armenian",
  AO: "Angolan",
  AQ: "Antarctic",
  AR: "Argentine",
  AS: "American Samoan",
  AT: "Austrian",
  AU: "Australian",
  AW: "Aruban",
  AX: "Ålandic",
  AZ: "Azerbaijani",
  BA: "Bosnian",
  BB: "Barbadian",
  BD: "Bangladeshi",
  BE: "Belgian",
  BF: "Burkinabé",
  BG: "Bulgarian",
  BH: "Bahraini",
  BI: "Burundian",
  BJ: "Beninese",
  BL: "Barthélemois",
  BM: "Bermudian",
  BN: "Bruneian",
  BO: "Bolivian",
  BQ: "Caribbean Dutch",
  BR: "Brazilian",
  BS: "Bahamian",
  BT: "Bhutanese",
  BV: "Bouvet Island",
  BW: "Motswana",
  BY: "Belarusian",
  BZ: "Belizean",
  CA: "Canadian",
  CC: "Cocos Islander",
  CD: "Congolese (DR Congo)",
  CF: "Central African",
  CG: "Congolese (Congo)",
  CH: "Swiss",
  CI: "Ivorian",
  CK: "Cook Islander",
  CL: "Chilean",
  CM: "Cameroonian",
  CN: "Chinese",
  CO: "Colombian",
  CR: "Costa Rican",
  CU: "Cuban",
  CV: "Cabo Verdean",
  CW: "Curaçaoan",
  CX: "Christmas Islander",
  CY: "Cypriot",
  CZ: "Czech",
  DE: "German",
  DJ: "Djiboutian",
  DK: "Danish",
  DM: "Dominican (Dominica)",
  DO: "Dominican",
  DZ: "Algerian",
  EC: "Ecuadorian",
  EE: "Estonian",
  EG: "Egyptian",
  EH: "Sahrawi",
  ER: "Eritrean",
  ES: "Spanish",
  ET: "Ethiopian",
  FI: "Finnish",
  FJ: "Fijian",
  FK: "Falkland Islander",
  FM: "Micronesian",
  FO: "Faroese",
  FR: "French",
  GA: "Gabonese",
  GB: "British",
  GD: "Grenadian",
  GE: "Georgian",
  GF: "French Guianan",
  GG: "Guernsey",
  GH: "Ghanaian",
  GI: "Gibraltarian",
  GL: "Greenlandic",
  GM: "Gambian",
  GN: "Guinean",
  GP: "Guadeloupean",
  GQ: "Equatoguinean",
  GR: "Greek",
  GS: "South Georgia and the South Sandwich Islands",
  GT: "Guatemalan",
  GU: "Guamanian",
  GW: "Bissau-Guinean",
  GY: "Guyanese",
  HK: "Hong Konger",
  HM: "Heard Island and McDonald Islands",
  HN: "Honduran",
  HR: "Croatian",
  HT: "Haitian",
  HU: "Hungarian",
  ID: "Indonesian",
  IE: "Irish",
  IL: "Israeli",
  IM: "Manx",
  IN: "Indian",
  IO: "Chagossian",
  IQ: "Iraqi",
  IR: "Iranian",
  IS: "Icelander",
  IT: "Italian",
  JE: "Jersey",
  JM: "Jamaican",
  JO: "Jordanian",
  JP: "Japanese",
  KE: "Kenyan",
  KG: "Kyrgyz",
  KH: "Cambodian",
  KI: "I-Kiribati",
  KM: "Comorian",
  KN: "Kittitian",
  KP: "North Korean",
  KR: "South Korean",
  KW: "Kuwaiti",
  KY: "Caymanian",
  KZ: "Kazakhstani",
  LA: "Lao",
  LB: "Lebanese",
  LC: "Saint Lucian",
  LI: "Liechtensteiner",
  LK: "Sri Lankan",
  LR: "Liberian",
  LS: "Mosotho",
  LT: "Lithuanian",
  LU: "Luxembourgish",
  LV: "Latvian",
  LY: "Libyan",
  MA: "Moroccan",
  MC: "Monégasque",
  MD: "Moldovan",
  ME: "Montenegrin",
  MF: "Saint-Martinoise",
  MG: "Malagasy",
  MH: "Marshallese",
  MK: "Macedonian",
  ML: "Malian",
  MM: "Burmese",
  MN: "Mongolian",
  MO: "Macanese",
  MP: "Northern Marianan",
  MQ: "Martinican",
  MR: "Mauritanian",
  MS: "Montserratian",
  MT: "Maltese",
  MU: "Mauritian",
  MV: "Maldivian",
  MW: "Malawian",
  MX: "Mexican",
  MY: "Malaysian",
  MZ: "Mozambican",
  NA: "Namibian",
  NC: "New Caledonian",
  NE: "Nigerien",
  NF: "Norfolk Islander",
  NG: "Nigerian",
  NI: "Nicaraguan",
  NL: "Dutch",
  NO: "Norwegian",
  NP: "Nepali",
  NR: "Nauruan",
  NU: "Niuean",
  NZ: "New Zealander",
  OM: "Omani",
  PA: "Panamanian",
  PE: "Peruvian",
  PF: "French Polynesian",
  PG: "Papua New Guinean",
  PH: "Filipino",
  PK: "Pakistani",
  PL: "Polish",
  PM: "Saint-Pierrais",
  PN: "Pitcairn Islander",
  PR: "Puerto Rican",
  PS: "Palestinian",
  PT: "Portuguese",
  PW: "Palauan",
  PY: "Paraguayan",
  QA: "Qatari",
  RE: "Réunionese",
  RO: "Romanian",
  RS: "Serbian",
  RU: "Russian",
  RW: "Rwandan",
  SA: "Saudi",
  SB: "Solomon Islander",
  SC: "Seychellois",
  SD: "Sudanese",
  SE: "Swedish",
  SG: "Singaporean",
  SH: "Saint Helenian",
  SI: "Slovenian",
  SJ: "Svalbard",
  SK: "Slovak",
  SL: "Sierra Leonean",
  SM: "Sammarinese",
  SN: "Senegalese",
  SO: "Somali",
  SR: "Surinamese",
  SS: "South Sudanese",
  ST: "São Toméan",
  SV: "Salvadoran",
  SX: "Sint Maartener",
  SY: "Syrian",
  SZ: "Swazi",
  TC: "Turks and Caicos Islander",
  TD: "Chadian",
  TF: "French Southern Territories",
  TG: "Togolese",
  TH: "Thai",
  TJ: "Tajik",
  TK: "Tokelauan",
  TL: "Timorese",
  TM: "Turkmen",
  TN: "Tunisian",
  TO: "Tongan",
  TR: "Turkish",
  TT: "Trinidadian",
  TV: "Tuvaluan",
  TW: "Taiwanese",
  TZ: "Tanzanian",
  UA: "Ukrainian",
  UG: "Ugandan",
  UM: "United States Minor Outlying Islands",
  US: "American",
  UY: "Uruguayan",
  UZ: "Uzbek",
  VA: "Vatican",
  VC: "Vincentian",
  VE: "Venezuelan",
  VG: "British Virgin Islander",
  VI: "U.S. Virgin Islander",
  VN: "Vietnamese",
  VU: "Ni-Vanuatu",
  WF: "Wallisian",
  WS: "Samoan",
  YE: "Yemeni",
  YT: "Mahoran",
  ZA: "South African",
  ZM: "Zambian",
  ZW: "Zimbabwean",
};

export type NationalityChoice = SearchableOption & {
  legacy?: boolean;
};

function standardNationalityChoices(): NationalityChoice[] {
  const used = new Set<string>();
  const choices: NationalityChoice[] = [];

  for (const country of countries) {
    const base = DEMONYM_BY_CODE[country.code] ?? country.name;
    let value = base;
    if (used.has(value.toLowerCase())) {
      value = `${base} (${country.name})`;
    }

    used.add(value.toLowerCase());
    choices.push({
      value,
      label: value,
      keywords: `${value} ${base} ${country.name} ${country.code}`,
    });
  }

  choices.sort((left, right) => left.label.localeCompare(right.label, "en"));
  return choices;
}

const STANDARD_NATIONALITY_CHOICES = standardNationalityChoices();

export function getStandardNationalityChoices(): NationalityChoice[] {
  return STANDARD_NATIONALITY_CHOICES;
}

/**
 * Keeps the stored string exactly, including legacy free text and combined values
 * such as "Filipino, Singaporean". A standard demonym is not substituted unless
 * the stored text already matches it.
 */
export function buildNationalityChoices(
  stored: string | null | undefined
): NationalityChoice[] {
  const trimmed = stored?.trim() ?? "";
  if (!trimmed) {
    return STANDARD_NATIONALITY_CHOICES;
  }

  const exact = STANDARD_NATIONALITY_CHOICES.some((choice) => choice.value === trimmed);
  if (exact) {
    return STANDARD_NATIONALITY_CHOICES;
  }

  return [
    {
      value: trimmed,
      label: trimmed,
      keywords: trimmed,
      legacy: true,
    },
    ...STANDARD_NATIONALITY_CHOICES,
  ];
}

export function filterNationalityChoices(
  choices: readonly NationalityChoice[],
  query: string
): NationalityChoice[] {
  return filterSearchableOptions(choices, query);
}
