# What we can implement (feasibility)

Verdict: **yes, steal Tally’s capture patterns; no, do not clone Tally.**

Epic 25 parked embed, conditional logic, and multi-step as non-goals for **Registration Experience Studio** (branding). That was right for a design epic. A **new** epic — Registration Capture — can reopen a **narrow** slice without becoming a form IDE.

## Do this (fits Cohestra)

| # | Learn from Tally | Cohestra shape | Feasibility | Why |
|---|---|---|---|---|
| 1 | Hidden fields / UTMs | `hidden` field type + query/embed passthrough stored on registration | **High** — schema additive | Stops operators embedding Tally on Cohestra pages just for `?ref=` |
| 2 | Long answer | `textarea` type | **High** | Waivers notes, “tell us about you”; tiny renderer + validator |
| 3 | Date | `date` type (no date math) | **High** | DOB, preferred session date |
| 4 | Answer piping | Thank-you + confirmation email `@label` | **High** | Cheap perceived quality |
| 5 | Custom closed copy | Theme/meta closed message + optional close-at datetime | **High** | Tally’s close UX; we already have capacity |
| 6 | Slash insert in **admin** | `/` or type-to-add in FormFieldEditor (same types) | **Medium** | Matches Tally editor *without* a DnD canvas (still UX-legal) |
| 7 | reCAPTCHA / bot | Invisible challenge on public POST | **Medium** | Table stakes; Tally trained operators to expect it |
| 8 | Operator notify | Outbox email/Slack-ish on new registration | **Medium** | Tally Slack is free; we have none |
| 9 | Show/hide recipes | `visibleWhen: { fieldId, equals }` — 3–5 event recipes only | **Medium** | Guest name, dietary, member vs visitor. **No** formula language, **no** nested AND/OR IDE |
| 10 | Multi-step | Optional 2–3 pages: identity → details → consent; progress bar | **Medium** | UX already allowed wizard if >12 fields; never built |
| 11 | File / signature | `file` with size cap (waiver, student ID) | **Medium** | Storage + virus/MIME policy; not a portfolio product |
| 12 | Embed | iframe/script widget of **this activity’s** register page | **Medium-Hard** | Highest Tally-replacement feature; CSP, height, tenant host |
| 13 | Website contact | Website section that creates a Client (no activity) | **Medium** | Closes “I only wanted a contact form” leak to Tally |
| 14 | Draft / bounce | Partial registration → Client with incomplete flag | **Hard** | Cohestra can beat Tally (their partials don’t sync). Privacy + GDPR story needed |
| 15 | HMAC webhook | Tenant `registration.created` webhook + retry log | **Medium** | Stable `field.id` already exists |

## Do not do this

| Tally feature | Why not |
|---|---|
| 20+ types (NPS, matrix, ranking, CSAT, personality) | Surveys, not events. Dilutes FormFieldEditor. |
| `/logic` nested groups + calculate + jump IDE | Becomes Jotform. Unmaintainable against `form_schema` v1 freeze. |
| Stripe-in-form checkout | Ticketing is a different epic. Paddle is tenant billing. |
| Custom CSS / custom domain | NFR-12: platform tokens. Design tab already covers brand. |
| Notion/Sheets as system of record | We **are** the system of record. |
| Respondent save-and-resume via localStorage only | Weak; if we do drafts, write a Client. |
| Typeform one-question-per-page as default | Wrong for QR-at-the-door. Optional later. |

## Schema note

`form_schema` v1 is frozen in `docs/contracts/activity-form-schema-v1.md`. Additive types (`textarea`, `date`, `hidden`, `file`) and optional `visibleWhen` / `meta.pages` are a **v1.1 contract bump**, not a rewrite. Keep field `id` as the CRM key.

## Suggested epic cut

**Epic: Registration Capture (Tally-competitive, on-mission)**

1. **Slice A (weeks of work, not months):** hidden/UTM, textarea, date, piping, closed copy, slash-add in Form tab, operator new-lead email.
2. **Slice B:** `visibleWhen` recipes + optional 3-step layout.
3. **Slice C:** activity embed + website contact section.
4. **Later / maybe:** file upload, draft-as-client, tenant webhooks.

Slice A is enough that a host who “just wanted a nicer form” stays in Cohestra for the **event job**.
