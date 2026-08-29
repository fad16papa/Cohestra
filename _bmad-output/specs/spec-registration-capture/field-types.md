# Field types

Additive on `form_schema` version `1`. Catalog from `form-component-toolbox.md`.

## Already shipping

`text` · `phone` · `email` · `select` · `checkbox` · `consent` · `referral_source` · `section_header`

## Wave 1 — all plans (CAP-2)

| Type | Success rule |
|---|---|
| `textarea` | Multi-line; max 2000; name heuristics like `text` |
| `date` | `YYYY-MM-DD`; invalid rejected; no min/max/ranges |
| `hidden` | No Participant input; query or defaultValue; max 200; HTML stripped |
| `number` | Rejects non-numeric; optional min/max |
| `url` | `http` or `https` |
| `time` | `HH:mm`; no TZ math |
| `choice` | Single select; tap ≥ 44px |
| `yes_no` | Boolean |
| `multi_choice` | Several; optional min/max |
| `info` | NonInput; markdown-lite; max 2000 |
| `country` | ISO list; reuse phone-country data |

None of these satisfy Publish Gate.

## Wave 2 — Core+ (CAP-3)

| Type | Plan | Success rule |
|---|---|---|
| `scale` | Core+ | Labeled 1–5 skill, **not** NPS |
| `emergency` | Core+ | Compound `{ name, phone }`; one Field id |

Basic: `403 plan_locked`.

## Later / never

- Later (Pro, not this spec): `file`, `signature`.
- Never: NPS, CSAT, ranking, matrix, payment, calculated fields, video-in-form.

## Client extract

Name heuristics: `text` / `textarea`. Columns: `phone`, `email`, `consent`. All other new types → Answers + history only.
