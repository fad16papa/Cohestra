---
id: SPEC-registration-capture
companions:
  - glossary.md
  - field-types.md
  - brownfield.md
  - ../../planning-artifacts/ux-designs/ux-registration-capture-2026-08-29/DESIGN.md
  - ../../planning-artifacts/ux-designs/ux-registration-capture-2026-08-29/EXPERIENCE.md
  - ../../planning-artifacts/epics-registration-capture.md
  - ../../planning-artifacts/prds/prd-registration-capture-2026-08-29/form-authoring-tiers.md
  - ../../../docs/contracts/activity-form-schema-v1.md
sources:
  - ../../planning-artifacts/prds/prd-registration-capture-2026-08-29/prd.md
  - ../../planning-artifacts/prds/prd-registration-capture-2026-08-29/addendum.md
  - ../../planning-artifacts/prds/prd-registration-capture-2026-08-29/form-component-toolbox.md
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability only — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Registration Capture

## Why

**Pain + opportunity.** Operators open Tally.so for Hidden Fields, long text, date, closed copy, and `/` speed. Saturday’s guest list lands in a Sheet; Cohestra never gets the **Client**. Capture makes the Activity Form Tally-fast to author without becoming a form product. Every submit still upserts a deduped Client.

## Capabilities

- **CAP-1**
  - **intent:** Operator can add Hidden Fields whose values come from the public (and later embed-parent) query string, without Participant chrome.
  - **success:** `?ref=wa` with Field id `ref` persists `answers.ref`; missing query still submits; Hidden never satisfies Publish Gate or Client name/phone/email extract; admin + Client history show the Answer; HTML stripped, max 200.

- **CAP-2**
  - **intent:** Operator can add Wave 1 event Fields (textarea, date, number, url, time, choice, yes_no, multi_choice, info, country) on every plan that has the Form tab.
  - **success:** Each type saves, previews, publishes, submits, and shows in admin Answers (`info` display-only); validation rules in `field-types.md`; none satisfy Publish Gate; `form_schema` version stays `1`.

- **CAP-3**
  - **intent:** Operator can add Fields via `/` or **+** toolbox palette without a canvas.
  - **success:** Always group matches `field-types.md`; Core+ scale/emergency are `plan_locked` on Basic; type `<select>` remains fallback; NPS/matrix/ranking/payment absent.

- **CAP-4**
  - **intent:** Operator-authored thank-you and confirmation email substitute piping tokens from Answers / Client extract.
  - **success:** `{{full_name}}` `{{email}}` `{{phone}}` `{{field:<id>}}` substitute; one missing-value rule (empty or “there”); Hidden never appears on Participant success or confirmation email; hero still `RegistrationThemeResolver`.

- **CAP-5**
  - **intent:** Operator can set Closed message and optional Close-at so unavailable public Form shows their copy and rejects submit after that instant.
  - **success:** Closed message max 2000 markdown-lite, XSS-safe, plus reason chip; Close-at UTC store / Activity TZ display; precedence capacity → paused → Close-at → ended; empty Close-at does not datetime-close.

- **CAP-6**
  - **intent:** On successful public submit, Operator receives email without a webhook.
  - **success:** Outbox `RegistrationOperatorNotify` to `AdminContactEmail`; default on; Settings toggle; does not fire on Form edits.

- **CAP-7**
  - **intent:** Operator can save the draft Form as a tenant template and apply it to another unpublished Activity.
  - **success:** Snapshot is `TenantId`-scoped fields+meta, not theme; apply confirm-replaces like launch templates; slots Basic 1 / Core 5 / Pro 25 → `403 plan_locked`; Core community default; Pro Design pin + duplicate; launch templates remain.

- **CAP-8**
  - **intent:** Core+ Operator can show a Field only when another Field matches a Recipe.
  - **success:** `visibleWhen` equals/notEquals; invisible Fields not rendered/required; server drops spoofs; circular Recipes rejected; Basic `plan_locked`; nested AND/OR is a stop.

- **CAP-9**
  - **intent:** Pro Operator can optionally split the Form into Identity → Details → Consent.
  - **success:** Toggle only (not Field-count); auto-bucket; move Fields in the list; one submit; off = today’s one page; Core/Basic `plan_locked` for steps; Client identical to single-page.

- **CAP-10**
  - **intent:** Operator can embed one Activity Form on an allow-listed foreign origin.
  - **success:** `/embed/register/{slug}` iframe; same submit API; parent query → Hidden; `postMessage` height; `allowedEmbedOrigins` required; no `frame-ancestors *`; CSP relaxed only on embed route; admin not embeddable.

- **CAP-11**
  - **intent:** Core/Pro Operator can add a website Contact section that creates a Client without an Activity.
  - **success:** Fixed name/email/phone/message/consent; `POST /api/v1/public/website-inquiries`; upsert Client + website inquiry; marketing opt-in only if consent checked; Outbox `WebsiteInquiryOperatorNotify`; Basic `plan_locked`.

## Constraints

- One Form per Activity. Field `id` is the CRM key (lowercase `a-z0-9_-`, max 64).
- `form_schema` version stays `1`; additive types only; unknown types reject.
- Publish Gate: required phone **or** email. Hidden and Wave 1 types never satisfy it.
- Answers immutable after submit. Historical JSONB never rewritten.
- `registration_theme` never written into `form_schema`. Touchpoints resolver unchanged.
- `TenantPlanLimits` unchanged (250 / 500 / 5,000 regs/month plus seat/community/activity caps).
- UX-DR32 / UX-DR24: no Form canvas. Public IA remains `/register/{slug}`.
- No custom CSS / custom fonts (NFR-12).
- Paddle is tenant billing. No registrant checkout in-form.
- Tenant isolation on Answers, templates, Close-at, notify, embed hosts. ProblemDetails on API errors.
- Public POST remains Redis rate-limited.

## Non-goals

- Clone Tally (NPS, matrix, ranking, CSAT, document-as-product).
- Logic IDE (nested AND/OR, calculate, jump graph).
- Tally-style uncapped registrations.
- File upload, signature, draft-as-Client, HMAC webhooks (D/E/F).
- Tally JSON import; webhook-only Tally integration; incoming public webhooks.
- Typeform one-question-per-page as default.
- Bot friction in MVP stories.
- Reopen Studio as branding work; redesign confirmation email layout.

## Success signal

Francis publishes Saturday tennis from Cohestra (Hidden `ref`, textarea, Closed message) and does not open Tally. Maya’s `?ref=wa` submit is a Registration + Client; `ref` is visible on Registration detail. Publish Gate completion does not drop. He applies a saved template to the next Activity within 30 days of first save (SM-RC-1, SM-RC-2, SM-RC-5).

## Assumptions

- Operator notify To: tenant `AdminContactEmail` only.
- Steps enable by toggle only.
- Embed: iframe first; allow-list required.
- Contact gated Core/Pro like the website builder.
- Piping fallback: implementers pick empty **or** “there” and test that one rule.
