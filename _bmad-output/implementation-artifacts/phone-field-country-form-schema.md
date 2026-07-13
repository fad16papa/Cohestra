---
status: implemented
constraint: no major backend changes
---

# Phone field country — Activities form

## Developer assessment (Amelia)

**Requirement:** Operators must set which country a phone/mobile field expects. Launch templates default to **Singapore (+65)**.

**Approach:** Extend the existing v1 form schema JSON with optional `phoneCountry` (ISO 3166-1 alpha-2, e.g. `SG`, `PH`). No new tables, endpoints, or registration payload shape.

| Layer | Change | Size |
|-------|--------|------|
| JSONB schema | Optional `phoneCountry` on phone fields | Additive |
| API contract | `FormFieldDefinitionDto.PhoneCountry` | Additive |
| Normalization | `NormalizePhone(phone, isoCountry)` uses field country | Small |
| Validation | Server + client validate local format per country | Small |
| Legacy | Missing `phoneCountry` → Singapore (+65) for phone fields | Default aligned with launch templates |

## Operator UX

- **Form tab → Field properties:** When type is Phone, **Mobile country** select (Singapore listed first).
- **Launch templates:** TGH Tennis, Ikigai Pickleball, Board Game Night phone fields ship with `phoneCountry: "SG"`, placeholder `+65 …`.
- **Publish gate:** Phone fields must have a supported `phoneCountry` before publish.

## Public registration UX

- Fixed prefix from schema (e.g. `+65`), local number entry only.
- Helper: “Local SG mobile — country is set by the activity form.”
- Validation matches backend (SG: 8 digits starting 8/9; PH: 10 digits starting 9).

## Files

- `web/lib/phone-countries.ts` — calling codes, validation
- `web/components/activities/phone-country-select.tsx`
- `web/components/registration/phone-field-input.tsx`
- `src/Infrastructure/Registrations/PhoneCountrySupport.cs`
