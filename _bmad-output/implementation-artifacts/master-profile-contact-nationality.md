---
id: master-profile-contact-nationality
key: master-profile-contact-nationality
title: Master Profile contact number and nationality
status: review
created: 2026-11-20
baseline_commit: 4c9f895ab2ed0c2a004e4a4c76f5cdf4f1fcaed4
owner_gate: none
production: NO-GO
---

# Story: Master Profile contact number and nationality

Status: review

## Story

As an operator editing a client Master Profile,
I want the contact number to carry its country in one field and nationality to be chosen from the supported list,
so that I can correct contact details without a separate country control and without losing saved profile data.

## Acceptance Criteria

1. The Master Profile edit form has no separate "Mobile country" field and does not render `PhoneCountrySelect`.
2. Country selection lives inside the contact-number field. Each option in the open list shows that country's flag, country name, and dialing prefix (for example `🇸🇬 Singapore +65`). Countries that share a calling code stay separate options.
3. The selected contact control, and the Master Profile read-only contact value, display as `[flag] | [country prefix] - [contact number]`. The prefix is the existing dialing label (`+65`, not the ISO code). The number remains the national number the operator edits. Decorative separators are not the only accessible name.
4. On desktop, in the non-compact Master Profile layout, Email / social sits in the same row as the contact-number field. Its label, stored value, and save behavior stay "email or social handle" on `client.email`. Compact layout stays one column.
5. Nationality is a searchable dropdown of every nationality produced from `web/lib/countries.ts` via `web/lib/nationalities.ts`. A saved value that is not in that list, including combined text such as `Filipino, Singaporean`, remains selectable and is not rewritten until the operator chooses a different value.
6. Save still sends the current `UpdateClientMasterProfileRequest` fields. `phone` stays the local number, `phoneCountry` stays the ISO code, and `nationality` stays the display string. Validation, duplicate-phone rejection, consent, profession, residency, referral source, notes, and name behavior stay as they are.
7. The edit and read states are usable at a desktop width and at a narrow mobile width: the contact control does not overflow the card, the country list remains searchable, and compact placement still stacks.
8. Billing, public registration, and activity form phone fields keep `PhoneCountrySelect`. Plan entitlements and Cohestra AI are unchanged. Registration-history phone display is unchanged.

## Implementation, regression, and responsive checks

- Implementation: the selected contact control and the Master Profile read-only contact row match AC 3. The option list matches AC 2. Email remains the next field after contact in the non-compact grid.
- Regression: `web/lib/master-profile-fields.test.ts` still proves the separate mobile-country field is absent and the save payload fields are unchanged. `src/Infrastructure.Tests/Clients/ClientServiceUpdateMasterProfileTests.cs` still passes without a contract change. A nationality unit check proves a legacy stored string is kept and a standard demonym is offered.
- Responsive: at `sm` and above, non-compact contact and email share a row. Below that breakpoint, and whenever `compact` is true, they stack. The flag, prefix, and number stay on one line inside the contact control.

## Tasks / Subtasks

- [x] Adjust only the Master Profile contact presentation to the `[flag] | [prefix] - [number]` pattern (AC 2, 3, 7).
- [x] Keep Email / social beside that field on desktop and stacked when compact or narrow (AC 4, 7).
- [x] Confirm Nationality uses `buildNationalityChoices` and does not replace the dataset (AC 5, 6).
- [x] Add or extend the regression checks above. Do not add a new country library.

## Dev Notes

### Current baseline

Merged PR #585 (`5f48c52a`, on main `4c9f895ab2ed0c2a004e4a4c76f5cdf4f1fcaed4`) already removed the separate mobile-country field, introduced `ContactNumberField` and `NationalityField`, and paired contact with email in the non-compact grid. No open PR or branch duplicates this story. Do not rebuild those components.

The remaining delta is the selected display. `ContactNumberField` currently shows the flag and `+callingCode` in the `SearchableListbox` trigger, then a border, then the number input. `ClientPhoneDisplay` shows a boxed flag and `+prefix` plus the national number with a space. Neither is the required `[flag] | [prefix] - [number]` pattern.

`ClientPhoneDisplay` is also used by `web/components/clients/client-registration-history.tsx`. Change the Master Profile read row with a profile-specific presentation or an explicit prop. Do not change registration-history rendering as a side effect.

### What must be preserved

- `parsePhoneForEdit`, `normalizeLocalPhoneInput`, and `validatePhoneLocalNumber` in `web/lib/phone-countries.ts`.
- Save body in `ClientMasterFields`: local `phone`, ISO `phoneCountry`, trimmed `email`, trimmed `nationality`.
- `PATCH /api/v1/admin/clients/{id}/master-profile` and `UpdateClientMasterProfileRequest`. Do not add or rename fields.
- `phoneCountrySelectChoices` as the option source. Flags come from `isoToFlagEmoji`. Names and calling codes come from the existing phone-country list, which is keyed from `countries`.
- Nationality values are demonyms from `DEMONYM_BY_CODE`, falling back to the country name, de-duplicated, and sorted. `buildNationalityChoices` prepends an unmatched saved value with `legacy: true`.
- Email / social stays a free-text field. Do not add validation that rejects a social handle.
- `compact` still forces a single column. Desktop pairing is `sm:grid-cols-2` only when `compact` is false.
- `PhoneCountrySelect` in billing and activity form editing stays.

### Files to touch

- `web/components/clients/contact-number-field.tsx` — selected-state separators only.
- `web/components/clients/client-master-fields.tsx` — read-only contact presentation and the existing contact/email grid. Do not reorder unrelated fields.
- `web/components/clients/client-phone-display.tsx` — only if a new opt-in presentation is added. Default registration-history output stays.
- `web/lib/master-profile-fields.test.ts` — assert the display pattern and the unchanged payload.
- `web/lib/nationalities.ts` — read and test. Change it only if a supported country from `countries` has no choice.

Do not touch plan entitlement code, Cohestra AI, `ClientsController` master-profile action, or `ClientService.UpdateMasterProfileAsync` unless a test proves the current contract cannot represent the display. The display is derived from stored E.164 plus ISO country.

### Testing

- Web: `cd web && npx vitest run lib/master-profile-fields.test.ts` and any nationality test added beside `web/lib/nationalities.ts`.
- API regression, only if a contract file is actually edited: `dotnet test src/Infrastructure.Tests/Infrastructure.Tests.csproj --filter FullyQualifiedName~ClientServiceUpdateMasterProfileTests`.
- Browser: edit a saved client on desktop and at a narrow viewport. Confirm an existing Singapore number still shows its flag, `+65`, and local number; confirm a legacy nationality still appears; save and reload without dropping email, profession, residency, consent, referral source, or notes.

### DONE

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until no unresolved BLOCKER or MAJOR) → PRODUCT/UX ACCEPTANCE → CLOSE. Code review is not optional and is not one-shot. This spec commit does not implement the form and is not DONE.

Production remains NO-GO. Do not merge, deploy, change DNS, or touch the live host as part of writing this spec.

### References

- [Source: web/components/clients/client-master-fields.tsx]
- [Source: web/components/clients/contact-number-field.tsx]
- [Source: web/components/clients/nationality-field.tsx]
- [Source: web/lib/phone-countries.ts]
- [Source: web/lib/nationalities.ts]
- [Source: web/lib/countries.ts]
- [Source: src/Contracts/Clients/ClientDetailResponse.cs `UpdateClientMasterProfileRequest`]
- Merged implementation baseline: PR #585, commit `5f48c52a`

## Dev Agent Record

### Agent Model Used

Grok 4.7

### Debug Log References

- 2026-11-20 — Continued PR #592 at `8b4844ac`. Working tree clean. Diff against main was the spec only.
- 2026-11-20 — `npx vitest run lib/master-profile-fields.test.ts` failed on the new display assertions, then passed after the presentation change. `lib/nationalities.test.ts` passed (8).
- 2026-11-20 — Browser check on client `5eef9550-a290-420f-b9a7-14f467ad050b` (Ava Tan). Desktop read and edit place Email / social beside contact. Narrow layout stacks them. Contact stays on one line. No profile save.

### Completion Notes List

- Selected contact control and Master Profile read-only contact use `[flag] | [prefix] - [number]`.
- `ClientPhoneDisplay` default layout is unchanged, so registration history stays on the previous presentation.
- Read-only Name and Notes span the desktop row so Contact and Email / social share the next row. Compact layout stays one column.
- Nationality still uses `buildNationalityChoices`. The phone country list is the existing `CALLING_CODES` set. Canada is not in that set, so it is not a new choice.
- API payload and `PhoneCountrySelect` call sites were not changed.
- Status is review. This is not DONE. The next gate is `bmad-code-review` on the implementation HEAD. Do not merge or deploy.

### File List

- `_bmad-output/implementation-artifacts/master-profile-contact-nationality.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `web/components/clients/client-master-fields.tsx`
- `web/components/clients/client-phone-display.tsx`
- `web/components/clients/contact-number-field.tsx`
- `web/components/clients/searchable-listbox.tsx`
- `web/lib/master-profile-fields.test.ts`

## Composer implementation brief

Start from the files above. Do not create a second country dataset or a second phone widget.

1. Make the selected contact control and the Master Profile read-only contact value read `[flag] | [prefix] - [number]`.
2. Leave the open list as flag, country name, and dialing prefix.
3. Keep Email / social immediately beside contact on desktop, and stacked on narrow and compact layouts.
4. Keep Nationality on `buildNationalityChoices`, including legacy saved text.
5. Keep the existing save payload, validation, and API. Leave `PhoneCountrySelect`, entitlements, and Cohestra AI alone.
6. Extend the existing Vitest source test. Run the checks in Testing. Then follow the DONE loop. Do not deploy.
