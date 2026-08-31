# Public Registration Submit Contract (v1)

Epic 2→3 gate — frozen request/response shape for `POST /api/v1/public/registrations`.

Referenced by:

- OpenAPI: `POST /api/v1/public/registrations`
- Web public `RegistrationForm` submit (`web/lib/public-registration-api.ts`)
- Epic 3 registration ingestion and answer validation

## Request

`Content-Type: application/json`

Optional header:

| Header | Required | Notes |
|--------|----------|-------|
| `Idempotency-Key` | no | 1–128 characters; replays the original `201` response for identical payload retries (Story 3.2) |

```json
{
  "activitySlug": "weekend-tennis-clinic",
  "answers": {
    "full_name": "Elena Santos",
    "email": "elena@example.com",
    "consent": true
  }
}
```

| Property        | Type   | Required | Notes |
|-----------------|--------|----------|-------|
| `activitySlug`  | string | yes      | Public activity slug (lowercase, URL-safe) |
| `answers`       | object | yes      | Map of form field `id` → submitted value |

### Answer value types

Keys in `answers` must match field `id` values from [activity-form-schema-v1.md](./activity-form-schema-v1.md).

| Field type                         | JSON value type | Example |
|------------------------------------|-----------------|---------|
| `text`, `phone`, `email`           | string          | `"Elena Santos"` |
| `textarea`                         | string          | `"Prefers Saturday mornings"` (max 2000 after HTML strip; over-length is `400`, not truncated) |
| `date`                             | string          | `"2026-09-12"` (`YYYY-MM-DD` calendar date; invalid values are `400`) |
| `number`                           | string          | `"12"` (invariant decimal; optional min/max) |
| `url`                              | string          | `"https://example.com"` |
| `time`                             | string          | `"09:30"` (`HH:mm`) |
| `choice`                           | string          | `"option_a"` (option `value`) |
| `yes_no`                           | boolean         | `true` or `false` |
| `multi_choice`                     | string array    | `["sat","sun"]` |
| `country`                          | string          | `"PH"` (supported phone-country ISO) |
| `scale`                            | string          | `"3"` (values `"1"`–`"5"` with fixed skill labels) |
| `emergency`                        | object          | `{ "name": "Alex", "phone": "91234567" }` |
| `info`                             | —               | Display-only; no answer |
| `select`, `referral_source`        | string          | `"friend"` (option `value`) |
| `checkbox`, `consent`              | boolean         | `true` |
| `hidden`                           | string          | `"wa"` (max 200 after HTML strip). Query key = Field `id`. Missing/blank uses operator `defaultValue`. Never required for submit. |

Submissions are rejected when required fields are missing or invalid per the activity schema.

Fields with a Core+ `visibleWhen` Recipe are required only while visible. Answers for currently invisible Fields are dropped (spoofs do not persist).

Hidden answers are filled from the public link query (`?{fieldId}=…`) or the Field `defaultValue`. The public page does not render Hidden inputs. HTML is stripped; values longer than 200 characters after strip are rejected.

## Responses

### 201 Created (Story 3.1+)

```json
{
  "status": "created",
  "message": "Registration complete. Thank you!",
  "registrationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "registrationNumber": "REG20260616000001",
  "clientId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "confirmationEmailSent": true,
  "confirmationEmail": "elena@example.com",
  "successCopyMarkdown": "See you Saturday, Elena."
}
```

| Property            | Type   | Required | Notes |
|---------------------|--------|----------|-------|
| `status`            | string | yes      | Always `"created"` on success |
| `message`           | string | yes      | Human-readable confirmation |
| `registrationId`    | uuid   | yes      | Immutable registration record |
| `registrationNumber`| string | yes      | Human-readable check-in ID (`REG` + `YYYYMMDD` + 6-digit sequence) |
| `clientId`          | uuid   | yes      | Master client record (created or updated) |
| `confirmationEmailSent` | boolean | yes | `true` when SendGrid delivered a registration confirmation email |
| `confirmationEmail` | string \| null | yes | Recipient address when the client has an email on file; `null` when no email was captured |
| `successCopyMarkdown` | string \| null | yes | Operator thank-you copy with piping tokens substituted; `null` when unset |

When the client submitted an email, the API sends a branded transactional confirmation (no-reply sender) after persisting the registration. Send failures do not fail the registration; `confirmationEmailSent` is `false` in that case.

Idempotent retries with the same `Idempotency-Key` and payload return this same response body without creating a duplicate registration or sending another email.

### Planned extensions (later stories)

| Change | Notes |
|--------|-------|
| Full E.164 dedup matrix | Story 3.3 |

## Error responses

| Status | When |
|--------|------|
| `400 Bad Request` | Missing `activitySlug`/`answers`, invalid `Idempotency-Key`, or answers fail schema validation |
| `404 Not Found` | Unknown slug or activity not accepting registrations (draft/archived) |
| `409 Conflict` | `Idempotency-Key` reused with a different registration payload, client already registered for this activity, or activity has reached its max registrants cap (Story 20.1) |
| `429 Too Many Requests` | Per-IP sliding-window rate limit exceeded (Story 3.2, NFR-6) |

Problem details follow the API-wide `application/problem+json` convention.

### 409 Conflict — activity full (Story 20.1)

When a published activity has `maxRegistrants` set and registration count has reached that cap, new submissions return:

```json
{
  "title": "Activity full",
  "detail": "This activity is no longer accepting registrations.",
  "status": 409,
  "errorCode": "activity_full"
}
```

Duplicate-client checks run before the capacity check; an already-registered client still receives the existing already-registered `409` response.

Public activity GET (`/api/v1/public/activities/{slug}`) exposes separate fields: `isRegistrationOpen` (schedule), `isRegistrationFull`, `isRegistrationPaused`, `isRegistrationClosedAt` (Story 30.8), `registrationCount`, and optional `maxRegistrants`. Unavailable precedence on the public page: capacity full → paused → Close-at → Activity ended.

### 409 Conflict — registration closed at Close-at (Story 30.8)

When `form_schema.meta.registrationClosesAt` is set and server time is on or after that UTC instant:

```json
{
  "title": "Registration closed",
  "detail": "This activity is no longer accepting registrations.",
  "status": 409,
  "errorCode": "registration_closed_at"
}
```

## Authentication

None — public endpoint (`AllowAnonymous`).

## Rate limiting (Story 3.2)

Redis sliding-window limiter on `POST /api/v1/public/registrations` keyed by client IP (supports `X-Forwarded-For` first hop).

Default configuration (`PublicRegistrationRateLimit`):

| Setting | Default | Meaning |
|---------|---------|---------|
| `WindowSeconds` | 60 | Sliding window size |
| `MaxRequests` | 10 | Maximum POSTs per IP per window |

## Idempotency (Story 3.2)

When `Idempotency-Key` is present:

1. Successful responses are cached in Redis for 24 hours (configurable)
2. Retries with the same key and identical payload receive the cached `201` response
3. Reusing the key with a different payload returns `409 Conflict`
4. A short-lived Redis lock prevents duplicate registrations during concurrent retries

The web client sends a generated `Idempotency-Key` on each submit attempt.

## Persistence (Story 3.1)

On success the API:

1. Creates a `registrations` row with immutable JSONB `answers` linked to the activity
2. Creates or updates a `clients` row from extracted master fields (phone/email/name/consent/referral)
3. Completes synchronously within the 60-second registration reliability target (NFR-4)

Basic client matching uses normalized phone or email. Full dedup rules (E.164, merge-suspect) ship in Story 3.3.
