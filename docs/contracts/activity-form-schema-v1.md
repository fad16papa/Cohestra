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

## Validation (API)

The admin save endpoint rejects schemas that:

- Use an unsupported `version`
- Exceed 50 fields
- Duplicate field `id` values
- Use unknown `type` values
- Omit required `options` / `consentText` for conditional types
- Include `options` or `consentText` on incompatible types

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
