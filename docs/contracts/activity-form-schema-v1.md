# Activity Form Schema Contract (v1)

Epic 2→3 gate — frozen JSON shape stored in PostgreSQL `activities.form_schema` (JSONB).

Referenced by:

- OpenAPI: `PUT /api/v1/admin/activities/{id}/form-schema`
- OpenAPI: `POST /api/v1/public/registrations` (answer keys) — see [public-registration-v1.md](./public-registration-v1.md)
- `ActivityResponse.formSchema` on admin activity reads
- Epic 3 public `RegistrationForm` renderer and registration answer validation

## Top-level shape

```json
{
  "version": 1,
  "fields": []
}
```

| Property  | Type     | Required | Notes                          |
|-----------|----------|----------|--------------------------------|
| `version` | integer  | yes      | Must be `1` for this contract  |
| `fields`  | array    | yes      | Ordered list; may be empty     |
| `meta.splitIntoSteps` | boolean | no | Pro only. Default `false` keeps a single public page. |
| `meta.introMarkdown` | string | no | Optional welcome copy above fields (max 4000). |
| `meta.successCopyMarkdown` | string | no | Thank-you screen copy with piping tokens (max 2000). Hidden values never substitute. |
| `meta.confirmationEmailSubject` | string | no | Confirmation email subject with piping tokens (max 200). Layout unchanged. |
| `meta.confirmationEmailBodyMarkdown` | string | no | Confirmation email closing message with piping tokens (max 2000). Layout unchanged. |
| `meta.closedMessage` | string | no | Operator copy when the public Form is unavailable (max 2000). Markdown-lite; HTML stripped on render. Reason chip still shows. |

### Piping tokens (v1.1 additive)

Operator copy may include:

- `{{full_name}}`, `{{email}}`, `{{phone}}` — from Client extract / name heuristics
- `{{field:<id>}}` — formatted answer for a visible field

Missing values substitute to an empty string. Hidden and display-only fields (`hidden`, `section_header`, `info`) never substitute on Participant-visible surfaces (success screen and confirmation email).

## Field object

```json
{
  "id": "email",
  "type": "email",
  "label": "Email address",
  "required": true,
  "placeholder": "you@example.com",
  "options": null,
  "consentText": null
}
```

| Property       | Type     | Required | Notes |
|----------------|----------|----------|-------|
| `id`           | string   | yes      | Stable key for `registrations.answers` (lowercase `a-z`, `0-9`, `_`, `-`; max 64 chars) |
| `type`         | string   | yes      | One of the field types below |
| `label`        | string   | yes      | Operator-facing label (max 200 chars) |
| `required`     | boolean  | yes      | Whether submit must include a value |
| `placeholder`  | string   | no       | Input hint (max 200 chars) |
| `options`      | array    | conditional | Required for `select` and `referral_source` |
| `consentText`  | string   | conditional | Required for `consent` (max 2000 chars) |
| `phoneCountry` | string   | conditional | ISO 3166-1 alpha-2 for `phone` fields (e.g. `SG`, `PH`); launch templates default `SG` |
| `visibleWhen`  | object   | no       | Core+ Recipe: `{ "fieldId", "equals" \| "notEquals" }`. Circular rules reject. Basic → `403 plan_locked`. |
| `step`         | string   | no       | Pro steps bucket: `identity` \| `details` \| `consent`. Ignored unless `meta.splitIntoSteps`. |
| `defaultValue` | string   | no       | **v1.1 additive.** Hidden fields only. Trimmed, HTML-stripped, max 200. Used when the public link omits the matching query key. |
| `min` / `max`  | number   | no       | **v1.1 additive.** `number` value bounds or `multi_choice` selection counts. Inclusive. |
| `infoText`     | string   | no       | **v1.1 additive.** `info` body. Markdown-lite, max 2000 after HTML strip. |

### Option object (`options[]`)

```json
{ "value": "instagram", "label": "Instagram" }
```

- `value` and `label` are required strings; `value` must be unique within the field.

## Field types (v1 enum)

| `type`             | Purpose | Extra rules |
|--------------------|---------|-------------|
| `text`             | Free-text input | — |
| `phone`            | Phone capture | `phoneCountry` defaults to `SG` when omitted; set `PH` explicitly for Philippines |
| `email`            | Email capture | Used for dedup in Epic 3 |
| `select`           | Single choice dropdown | `options` required |
| `checkbox`         | Boolean opt-in | — |
| `consent`          | Consent block (Board Game template) | `consentText` required |
| `referral_source`  | “How did you hear about us?” | `options` required |
| `hidden`           | Campaign query passthrough (v1.1 additive; `version` stays `1`) | No Participant UI. Optional `defaultValue`. Field `id` is the query key (`ref` → `?ref=wa`). May be `required: true` but does not satisfy the Publish Gate and never blocks submit. No `placeholder` / `options` / `consentText` / `phoneCountry`. |
| `textarea`         | Long text / notes (v1.1 additive; `version` stays `1`) | Multi-line string. Answers max 2000 after HTML strip. Same name heuristics as `text` for Client extract. Does **not** satisfy the Publish Gate. No `options` / `consentText` / `phoneCountry` / `defaultValue`. Placeholder allowed. |
| `date`             | Calendar date (v1.1 additive; `version` stays `1`) | Answer must be `YYYY-MM-DD` (valid calendar date). Not mapped to a Client column. No min/max, disabled weekdays, ranges, or timezone math. Does **not** satisfy the Publish Gate. No `options` / `consentText` / `phoneCountry` / `defaultValue`. Placeholder allowed. |
| `number`           | Numeric (v1.1 additive) | Invariant decimal. Optional inclusive `min` / `max`. Does **not** satisfy the Publish Gate. |
| `url`              | Link (v1.1 additive) | Absolute `http` or `https` URL. |
| `time`             | Clock time (v1.1 additive) | `HH:mm`. No timezone math. |
| `choice`           | Single pick (v1.1 additive) | `options` required. Public tap targets ≥ 44px. |
| `yes_no`           | Boolean (v1.1 additive) | JSON boolean. Required means answered, not “must be yes”. |
| `multi_choice`     | Several picks (v1.1 additive) | `options` required. Answer is a string array. Optional `min` / `max` are selection **counts**. |
| `info`             | Display-only (v1.1 additive) | NonInput. `infoText` markdown-lite, max 2000 after HTML strip. No Answer. |
| `country`          | ISO country (v1.1 additive) | Reuses phone-country ISO list (SG, PH, MY, ID, TH, VN, US, GB, AU, HK, JP, KR, CN, IN). |
| `scale`            | Labeled 1–5 skill (Core+ additive) | Answer is `"1"`–`"5"` with fixed labels (Beginner → Expert). **Not** NPS. Does **not** satisfy Publish Gate. Basic save → `403 plan_locked`. |
| `emergency`        | Compound emergency contact (Core+ additive) | One field id; answer is `{ "name": string, "phone": string }`. `phoneCountry` defaults to `SG`. Does **not** satisfy Publish Gate or Client extract. Basic save → `403 plan_locked`. |

## Validation (API)

The admin save endpoint rejects schemas that:

- Use an unsupported `version`
- Exceed 50 fields
- Duplicate field `id` values
- Use unknown `type` values
- Omit required `options` / `consentText` for conditional types
- Include `options` or `consentText` on incompatible types
- Put `placeholder`, `options`, `consentText`, or `phoneCountry` on `hidden`
- Put `defaultValue` on a non-hidden field, or a `defaultValue` longer than 200 characters after HTML strip

## Immutability note (FR-2)

Saving a form schema updates the activity for **future** registrations only. Existing `registrations.answers` JSONB rows are never rewritten (Story 2.4+).

## Example — minimal contact capture

```json
{
  "version": 1,
  "fields": [
    {
      "id": "full_name",
      "type": "text",
      "label": "Full name",
      "required": true,
      "placeholder": null,
      "options": null,
      "consentText": null
    },
    {
      "id": "phone",
      "type": "phone",
      "label": "Mobile number",
      "required": true,
      "placeholder": "+65 …",
      "options": null,
      "consentText": null,
      "phoneCountry": "SG"
    },
    {
      "id": "referral",
      "type": "referral_source",
      "label": "How did you hear about us?",
      "required": false,
      "placeholder": null,
      "options": [
        { "value": "friend", "label": "Friend" },
        { "value": "social", "label": "Social media" }
      ],
      "consentText": null
    }
  ]
}
```
