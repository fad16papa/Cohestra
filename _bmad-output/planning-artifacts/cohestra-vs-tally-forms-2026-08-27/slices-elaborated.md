---
title: Registration Capture — slices A–F elaborated
status: draft
created: 2026-08-28
updated: 2026-08-28
sources:
  - feasibility.md
  - comparison.md
  - recon-current-state.md
  - brainstorm-registration-capture-slices-2026-08-28
---

# What is a “slice”?

A slice is a **shippable cut** of one epic — **Registration Capture** — not a theme and not a Tally clone. Each slice has a host job, a Cohestra object it writes (almost always a **Client**), an explicit out-list, and a “done when” you can demo.

They came from the Tally.so comparison (`feasibility.md` items 1–15). Items 1–8 packed into **A**, 9–10 into **B**, 12–13 into **C**. Items 11, 14, 15 became **D / E / F** (later / maybe).

Goal: make Cohestra’s **activity registration form** Tally-fast to author, without becoming a generic form builder. Epic 25 (website branding) stays a non-goal.

## Saturday tennis (one host, all slices)

Francis runs Saturday tennis. Today he opens Tally because Cohestra’s Form tab feels like IT.

| He wants… | Slice |
|---|---|
| Long “skill level” notes, a date, `?ref=wa` on the Instagram link, a nicer closed message, an email when someone signs up, `/` to add a field | **A** |
| “Guest name” only if they bring a plus-one; a 3-step form if it gets long | **B** |
| Paste the form on the club Notion / put Contact on the Cohestra site | **C** |
| Upload the waiver PDF | **D** (later) |
| Still see people who typed a phone then bounced | **E** (maybe never) |
| Zapier when someone registers | **F** (later, if asked) |

| Slice | Job | Host feeling when done |
|---|---|---|
| **A** | Better fields + faster Form tab + attribution + notify | “I don’t need Tally for Saturday’s signup.” |
| **B** | Light logic + optional steps | “Guest name only shows when they say yes.” |
| **C** | Put the form where the audience already is | “I paste Cohestra on Notion/our site, not Tally.” |
| **D** | File / waiver upload | “They attach the PDF here.” |
| **E** | Abandoned signup still a lead | “I can nudge the ones who bounced.” |
| **F** | Signed outbound webhook | “Zapier gets the same person Cohestra stored.” |

---

# Slice A — Form fundamentals (ship first)

**One-liner:** Make the Form tab feel modern and capture UTMs, without changing the public page into a wizard.

**Outcome:** Hosts can build the same registration they currently put in Tally for a simple event — phone, email, notes, date, campaign link — entirely in Cohestra.

## A1. Hidden fields + UTM / query passthrough

**What it is**  
A new field type `hidden`. Operators add fields like `utm_source`, `ref`, `host_id`. Public page reads URL query (and later embed query) and writes those values into `registrations.answers` on submit. Values are not shown to the respondent.

**Why (Tally lesson)**  
Hosts wrap Cohestra (or Instagram bios) with Tally just to know “came from WhatsApp.” Hidden fields kill that.

**Operator UX**

- Form tab → Add field → **Hidden**.
- Label = admin-only name (“WhatsApp campaign”).
- Field `id` = query key (e.g. `ref`). Optional default if query missing.
- Preview shows a muted “Hidden · filled from link” chip, not an input.

**Public UX**

- Link: `https://creativorare…/register/saturday-tennis?ref=wa&utm_source=ig`
- Form looks unchanged.
- Submit stores `{ "ref": "wa", "utm_source": "ig", … }`.

**Rules**

- Hidden never counts toward “required phone/email” publish gate.
- Not extracted into Client name/phone/email (skip in `ClientProfileExtractor`).
- Max length per value (e.g. 200). Strip HTML.
- Unknown query keys ignored unless a matching hidden field `id` exists.

**Touches**

- `FormFieldTypes.cs`, `FormSchemaValidator.cs`, `activity-form-schema-v1.md`
- `registration-form.tsx`, `public-registration-open.tsx` / register page
- `RegistrationAnswerValidator.cs`, `ClientProfileExtractor.cs`
- Reports: optional filter later; v1 at least show on registration detail / client answer history

**Done when**  
Host shares `?ref=wa`, registers, opens that registration in admin, sees `ref = wa`.

---

## A2. Long text (`textarea`)

**What it is**  
Multi-line text field for “Tell us about your level”, medical notes, “anything we should know.”

**Operator UX**  
Type **Long text** (or slash `long`). Optional placeholder. Required toggle. Max length (e.g. 2000).

**Public UX**  
`<textarea>` with same mobile `min-h` language as other controls.

**Rules**  
Extracted to Client only if field id matches name heuristics (same as `text`). Otherwise stays in answers JSONB.

**Done when**  
Template or tennis form can replace a cramped single-line “notes” with long text; submit persists.

---

## A3. Date (`date`)

**What it is**  
Native date input (YYYY-MM-DD). No date math, no “disable Sundays,” no ranges in A.

**Operator UX**  
Type **Date**. Optional “must be in future / past” later — **not in A** (keep validator simple: required + parseable date).

**Public UX**  
Browser date picker. Store ISO date string in answers.

**Client extract**  
Do not map into Client columns in A (no DOB column today). Show in registration history.

**Done when**  
“Preferred session date” field works end-to-end.

---

## A4. Answer piping (thank-you + confirmation email)

**What it is**  
Personalize success screen and confirmation email with submitted values, Tally-style `@mention` but Cohestra-shaped.

**v1 syntax (simple)**  
In closed/success copy and email subject/body templates:

- `{{full_name}}` / `{{email}}` / `{{phone}}` — resolved from answers by field id **or** Client extract
- Or pipe any field: `{{field:notes}}`

**Where**

- `registration-success-screen.tsx` — “See you Saturday, {{full_name}}.”
- `RegistrationConfirmationEmailBuilder.cs` — same tokens in subject/HTML

**Rules**

- Missing value → empty string or fallback “there”.
- Never pipe hidden secrets into public success if marked sensitive (optional flag; default hidden fields **not** piped to public screen, OK in admin).

**Done when**  
Success screen shows the registrant’s name from the name field without hardcoding.

---

## A5. Custom closed copy (+ optional close-at)

**What it is**  
When registration is closed (capacity, schedule end, paused, or operator “close at” datetime), show **operator-written** message instead of only platform copy.

**Operator UX**  
Form tab or Design tab section:

- “Closed message” textarea (markdown-lite / plain, max ~2000)
- Optional “Close registrations at” datetime (activity timezone / UTC stored)

**Public UX**  
`public-registration-unavailable.tsx` prefers operator message when present; still shows reason chip (Full / Closed / Paused) for clarity.

**Rules**

- Capacity full still wins (don’t take over-capacity submits).
- Close-at is evaluated server-side on GET public activity + submit.

**Done when**  
Host sets “Waitlist opens Monday on WhatsApp” → full event shows that text.

---

## A6. Slash-add in Form tab (admin only)

**What it is**  
Tally muscle memory for **operators**, without a drag-and-drop canvas (still banned by UX-DR32).

**Operator UX**

- In FormFieldEditor, empty “Add field” row: type `/` or click **+** → palette:
  - Short text, Long text, Email, Phone, Date, Select, Checkbox, Consent, Referral, Section header, Hidden
- Keyboard: arrow + Enter to insert; Esc closes.
- Convert type still via dropdown on the field card (existing).
- Reorder stays grip / up-down (existing).

**Not in A**

- Side-by-side columns
- Typing free prose that becomes a field mid-document
- Live public WYSIWYG editor

**Done when**  
Operator can add Email + Hidden without using the old type `<select>` as the primary path (select can remain as fallback).

---

## A7. Operator “new registration” notification

**What it is**  
When someone submits, email the workspace billing/admin contact (or activity owner email if we have one) — Tally Slack/email equivalent.

**v1**

- Outbox message type `RegistrationOperatorNotify` (mirror `RegistrationConfirmation`)
- To: tenant `AdminContactEmail` (same as billing owner pattern)
- Subject: `New registration · {Activity title} · {Name or phone}`
- Body: name, phone, email, link to Activity → Registrations tab
- Preference: Settings → Notifications toggle “Email me on new registrations” default **on** for Core/Pro (or always on in A, toggle in fast follow)

**Not in A**  
Slack native, per-activity mute, digest batching (can add later if volume hurts).

**Done when**  
Submit as guest → operator inbox gets mail within outbox processing window.

---

## A8. (Optional in A if cheap) Bot friction

Invisible reCAPTCHA / Turnstile on `POST /api/v1/public/registrations` if keys configured; no-op in local without keys. Can slip to B if keys/ops are messy.

---

## Slice A — Explicitly out

- Show/hide, multi-step, embed, website contact, file upload, drafts, webhooks, payments, NPS/matrix, nested logic.

## Slice A — Contract

Bump docs to **form_schema v1.1** additive:

```json
{
  "version": 1,
  "meta": {
    "introMarkdown": "...",
    "closedMessage": "...",
    "registrationClosesAt": "2026-09-01T10:00:00Z"
  },
  "fields": [
    { "id": "notes", "type": "textarea", "label": "Notes", "required": false },
    { "id": "session_date", "type": "date", "label": "Preferred date", "required": false },
    { "id": "ref", "type": "hidden", "label": "Campaign ref", "required": false, "defaultValue": null }
  ]
}
```

`version` can stay `1` if we document additive types; or `1` with published allowlist update — prefer **same version, expanded type enum** to avoid migrating every activity.

## Slice A — Acceptance (epic-level)

1. New types save, preview, publish, submit, show in admin registration answers.  
2. `?ref=` survives submit.  
3. Success + confirmation email can include `{{full_name}}`.  
4. Closed message shows when full/closed.  
5. Slash palette adds a field.  
6. Operator receives new-registration email.  
7. Unit tests: `FormSchemaValidator`, `RegistrationAnswerValidator`.  
8. No regression: publish still requires required phone **or** email.

---

# Slice B — Event-shaped logic + optional steps

**One-liner:** The form can react like a good event RSVP — without becoming Jotform.

**Outcome:** “Bringing a guest?” → guest name appears. Long forms can split into Identity → Details → Consent.

## B1. `visibleWhen` recipes (not a logic IDE)

**What it is**  
Optional field property:

```json
"visibleWhen": {
  "fieldId": "bringing_guest",
  "equals": "yes"
}
```

**v1 operators (keep tiny)**

| Op | Meaning |
|---|---|
| `equals` | Exact match (select value / checkbox true→`"true"`) |
| `notEquals` | Optional if needed |
| Checkbox | `equals: true` / `false` |

**No in B:** nested AND/OR groups, calculate, jump-to-page as a free graph, regex, “contains”, cross-page jumps as a programming model.

**Operator UX — recipes, not raw JSON**

Form tab → field card → **Show only when…**

Presets:

1. **Guest name** — show when `bringing_guest` is Yes  
2. **Dietary** — show when `meal` is Yes  
3. **Member ID** — show when `attendee_type` is Member  
4. **Visitor company** — show when `attendee_type` is Visitor  
5. **Custom** — pick controlling field + value (advanced)

**Public UX**

- Hidden fields not rendered (and not required while hidden).
- On submit, server re-validates visibility (don’t trust client). Hidden-and-empty → omit or clear; visible-and-required → must be present.

**Done when**  
Guest name required only if bringing guest = yes; submit without guest when No succeeds; submit with Yes and empty guest fails.

---

## B2. Optional multi-step layout

**What it is**  
`meta.pages` or field `page: 1|2|3` grouping. Default: single page (today).

**Recommended v1 steps when enabled**

| Step | Typical fields |
|---|---|
| 1 Identity | name, phone, email |
| 2 Details | selects, dates, textarea, recipe fields |
| 3 Consent | consent, referral, marketing checkbox |

**Operator UX**

- Toggle: “Split into steps” on Form tab.  
- Auto-bucket by type heuristics + allow drag field between step columns **within the list editor** (not a freeform canvas).  
- Progress bar labels: Identity / Details / Consent (editable later).

**Public UX**

- Next / Back. Progress indicator.  
- Validate current step before Next.  
- Submit only on last step.  
- Mobile QR still works; do **not** default every form to steps (only when toggle on or field count ≥ N, e.g. 10).

**Not Typeform**  
No auto-advance one-question-per-page as default.

**Done when**  
10-field tennis form with toggle on → 3 steps → submit creates Client same as single page.

---

## Slice B — Explicitly out

- Embed, website contact, file upload, formula pricing, jump-to-thank-you variants beyond simple closed message (A), nested logic trees.

## Slice B — Acceptance

1. Recipe + custom `visibleWhen` round-trip in schema.  
2. Server-side visibility enforcement.  
3. Multi-step toggle works; off = current single page.  
4. Publish gate still passes.  
5. Preview shows steps and conditional fields.  
6. Tests for validator visibility rules.

---

# Slice C — Distribution (where the form lives)

**One-liner:** Stop sending people to Tally because “our form has to live on our site / Notion.”

**Outcome:** Hosts embed Cohestra registration, and the website builder can capture a lead without inventing a fake activity.

## C1. Activity registration embed

**What it is**  
A shareable embed for **one activity’s** public registration (not a generic form builder embed).

**Operator UX (Share kit)**

- Snippets: **Inline iframe**, **Popup button** (script), optional full-page.  
- Copy code; height guidance; “Updates automatically when you edit the form.”  
- Preview in Share kit.

**Technical**

- New route e.g. `/embed/register/{slug}` — chrome-light (no big marketing header).  
- Relax **only this route**: today CSP is `frame-ancestors 'none'` + `X-Frame-Options: DENY` (`web/content-security-policy.ts`, nginx). Embed needs allow-list or `frame-ancestors *` / specific parents — **product decision**: start with `*` for Core/Pro embeds, document clickjacking tradeoff, or restrict to configured `allowedEmbedOrigins[]` in tenant settings (better).  
- `postMessage` height resize for iframe (Tally does this).  
- Same submit API; pass parent query string into hidden fields.

**Security**

- Cookie/auth not required for public embed.  
- Rate limits already exist — keep.  
- Prefer tenant setting **Allowed embed hosts** before opening `*`.

**Done when**  
iframe on a static HTML page on another origin shows form, submits, registration appears in Cohestra.

---

## C2. Website builder — Contact section → Client

**What it is**  
New website section type `contact_form` (or `lead_capture`): name + email + phone + message (fixed small schema or reuse a **tenant default intake schema**). Submit creates/updates **Client** with `LeadStatus = New`, **no Activity / Registration** (or a synthetic “Website inquiry” activity — prefer **no Activity** + timeline event `website_inquiry`).

**Why**  
Hosts open Tally for “just a contact form on our homepage.” Website builder currently cannot intake.

**Operator UX**

- Website → Add section → **Contact form**.  
- Edit heading, intro, button label, success message.  
- Fields: fixed set in C (name, email, phone, message) — not full FormFieldEditor.  
- Plan gate: Core/Pro (align with website builder plans).

**Public UX**

- Renders on published site.  
- Submit → thank you.  
- Client appears in Clients list; timeline shows inquiry.

**Backend**

- New `POST /api/v1/public/website-inquiries` (tenant-scoped host).  
- Dedup by phone/email like registrations.  
- Optional operator notify (reuse A7).

**Done when**  
Published homepage contact submit creates a Client without creating an Activity registration.

---

## Slice C — Explicitly out

- Embedding arbitrary Cohestra admin pages.  
- Popup that loads whole dashboard.  
- Turning website builder into Tally (no logic IDE on site sections).  
- Multi-form library detached from activities (except this one contact section).

## Slice C — Acceptance

1. Embed snippet works cross-origin with height resize.  
2. Tenant can restrict embed parents (if we ship allow-list).  
3. Contact section publish + submit → Client.  
4. CSP/nginx/docs updated in lockstep.  
5. Security note in deploy docs.

---

# Later / maybe — D, E, F

These three showed up in the Tally comparison because hosts use Tally for them. They are **not** in Registration Capture v1. They are written at the same depth so nobody confuses “we said maybe” with “we forgot.”

Ship order if we ever do: **D (file) only after a storage decision**, **F (webhook) only after a tenant asks for Zapier-out**, **E (draft) last** — it changes what a Client *is*.

---

# Slice D — File upload (later)

**One-liner:** Registrant attaches a waiver PDF, student ID photo, or medical note; Cohestra stores a bounded blob and links it on the Registration (and optionally the Client timeline).

**Tally job stolen:** Tally File Upload / Signature. Hosts currently “email me the waiver” or use Tally because Cohestra cannot take a file.

**Why not in A:** Needs object storage, MIME allow-list, size cap, virus/content scan policy, retention/GDPR delete, and an admin download path. That is a platform epic wearing a form-type costume.

## D1. Field type `file`

**What it is**  
Additive `form_schema` type:

```json
{
  "id": "waiver",
  "type": "file",
  "label": "Signed waiver (PDF)",
  "required": true,
  "accept": ["application/pdf", "image/jpeg", "image/png"],
  "maxBytes": 5242880
}
```

**Operator UX**  
Form tab → Add field → **File**. Pick allowed kinds (PDF / images). Max size (default 5 MB). Required toggle. Helper text (“photo of student pass”).

**Public UX**  
Native file picker. Show filename + size after pick. Mobile: camera roll. No drag-drop canvas.

**Submit flow**

1. Client requests upload URL: `POST /api/v1/public/registrations/upload-intent` (activity slug + field id) → short-lived signed PUT to object store.
2. Client PUTs bytes.
3. Registration POST includes `{ "waiver": { "objectKey": "...", "contentType": "...", "bytes": 12345 } }` — **not** the file bytes in JSON.
4. Server verifies object exists, MIME, size, and that the key was issued for this activity/field.

**Storage**

- Tenant-prefixed key: `tenants/{tenantId}/activities/{activityId}/registrations/{registrationId}/{fieldId}/{uuid}`.
- Prefer existing blob story if any; otherwise S3-compatible (MinIO local).
- Antivirus: ClamAV or cloud scanner on complete; quarantine until clean. Fail closed in production.

**Admin UX**  
Registration detail: download / open. Client timeline: “Uploaded waiver for Saturday tennis.” Deleted Client → delete or tombstone objects (GDPR).

**Rules**

- Never extract files into Client profile columns.
- Do not preview untrusted PDFs in an iframe without sandbox.
- Signature-as-image can be a constrained `file` (png) in D; a dedicated signature pad is **not** required.

**Failure modes**

- Phone on bad wifi: resumable upload or clear “try again” — do not create a Registration with a missing required file.
- Host downloads malware: scan + Content-Disposition attachment.
- Capacity: one file per field in v1; no multi-file galleries (that is a portfolio product).

**Done when**  
Required PDF field → guest uploads from phone → operator downloads the same bytes from the registration row; unscanable/oversize rejected with a public error.

**Slice D out:** video, arbitrary MIME, public file URLs without auth, using files as a DAM.

---

# Slice E — Draft-as-client (later, maybe never)

**One-liner:** Someone starts the form, abandons it, and Cohestra still has a **person** (or a clearly incomplete lead) instead of Tally’s “partial in Tally, nowhere in your CRM.”

**Tally job stolen / beaten:** Tally can email partials; they do not become Cohestra Clients. This is the one place we can *beat* Tally — and the easiest way to pollute the CRM.

**Why last / maybe never:** Changes the definition of Client. Today a Client appears when a registration **submits**. A draft Client is a half-person: maybe no consent, maybe a typo email, maybe GDPR-unlawful if we stored PII before they hit Submit.

## E1. Product decision (must precede any story)

Pick **one**:

| Option | Behavior | Use if |
|---|---|---|
| **E-off (recommended default)** | No drafts. Incomplete POST is discarded. | We value a clean Clients list. |
| **E-session** | Browser/session holds answers; no server Client until submit. | Reduce bounce on multi-step (Slice B) without CRM pollution. |
| **E-lead** | Server stores `Client` with `LeadStatus = Incomplete` after Identity step (name + phone or email). Operator can campaign “finish signup.” | Hosts explicitly want abandoned-cart for events. |

Do not implement E-lead without: lawful basis (they typed PII but did not consent yet), retention (auto-delete Incomplete after N days), and operator UI that does not mix Incomplete with “coming Saturday.”

## E2. If E-lead

**What it is**  
After step 1 (Identity) validates, `POST /api/v1/public/registrations/draft` upserts Client (existing phone/email dedup) and a `Registration` with `status = draft`. Final submit promotes to `confirmed` (or whatever the live status is today).

**Operator UX**  
Registrations tab filter: Draft / Complete. Incomplete clients hidden from campaign “all active” by default. Banner: “12 unfinished signups — auto-delete in 7 days.”

**Public UX**  
Return-to-form link in email optional. No “save and resume” magic cookie as the only store (Tally’s weak pattern).

**Rules**

- Draft does **not** consume capacity until complete.
- Draft does **not** fire A7 operator “new registration” (or fires a different “someone started” mail — product choice, default **no**).
- Consent field not yet shown → do not set marketing opt-in on the Client.

**Failure modes**

- Duplicate drafts for same phone: upsert one draft registration per activity.
- Host thinks capacity is full because drafts counted — they must not.
- GDPR request: delete draft Client + answers.

**Done when**  
Identity-only abandon creates filterable Incomplete lead; completing the form promotes it; capacity and campaigns ignore drafts.

**Slice E out:** LocalStorage-only resume as the product; treating drafts as attended; selling drafts as a Tally-clone feature.

---

# Slice F — HMAC tenant webhooks (later)

**One-liner:** On `registration.created`, POST a signed JSON payload to a URL the tenant configured, so Zapier/Make/their CRM can fire without polling Cohestra.

**Tally job stolen:** Tally webhooks. Hosts who live in Sheets/Slack still want a ping even after they capture in Cohestra.

**Why not in A:** A7 (operator email) covers “I got a lead” for most hosts. Webhooks are an **integration product**: signing secrets, retry, dead-letter, payload versioning, SSRF protection (don’t POST to 169.254.169.254), and a debug log UI. Build when a paying tenant asks for Zapier-out — not to look like Tally.

## F1. What ships

**Operator UX (Settings → Developers, Pro)**

- Endpoint URL (HTTPS only).
- Secret shown once; rotate.
- Events: v1 only `registration.created` (and maybe `website_inquiry.created` if C2 exists).
- Delivery log: timestamp, HTTP status, retry count, “redeliver.”

**Payload (illustrative)**

```json
{
  "id": "evt_…",
  "type": "registration.created",
  "createdAt": "2026-09-01T10:00:00Z",
  "data": {
    "registrationId": "…",
    "activityId": "…",
    "activitySlug": "saturday-tennis",
    "clientId": "…",
    "answers": { "full_name": "…", "ref": "wa" }
  }
}
```

**Security**

- Header `X-Cohestra-Signature: sha256=<hmac>`.
- Timestamp header; reject old replays on the consumer side (document it).
- Outbound allow-list: public HTTPS, DNS resolved to non-private IPs (SSRF).
- Retry: 1m / 5m / 30m / 2h, then dead-letter. Same outbox pattern as email.

**Rules**

- Field `id`s in `answers` are the contract (already stable in form_schema).
- Do not send file bytes; send downloadable admin URLs or object keys if D exists.
- Hidden fields **are** included (they’re why hosts want webhooks for attribution).

**Failure modes**

- Tenant endpoint 500 forever → log, don’t block registration.
- Payload schema change → `type` versioning (`registration.created.v2`) not silent field rename.
- Secret leaked → rotate invalidates old signature immediately.

**Done when**  
Submit → webhook delivered with valid HMAC; failed delivery retries; operator can redeliver from the log; registration still succeeds if the webhook is down.

**Slice F out:** Incoming webhooks (Tally-style form POST into Cohestra from the internet) — that is a different attack surface. Slack native app. GraphQL subscriptions.

---

# How the slices relate

```text
Slice A ──► hosts stop needing Tally for basic event signup
   │
   ▼
Slice B ──► hosts stop needing Tally for “if guest then…” RSVPs
   │
   ▼
Slice C ──► hosts stop pasting Tally on their site / Notion

Later, only if the job is real:
   D file ── storage + scan
   F webhook ── a tenant asked for Zapier-out
   E draft ── last; changes what a Client is
```

Do **not** start C before A. B can parallelize after A’s schema bump. C1 (embed) is the riskiest; C2 (contact) is medium and high product value. D/E/F stay out of the v1 epic.

---

# Rough sizing (engineering, not calendar)

| Slice | Relative size | Risk |
|---|---|---|
| A | M — many small vertical slices | Low–medium (schema + email) |
| B | M — visibility rules need careful tests | Medium (scope creep into logic IDE) |
| C | L — CSP/embed + new public ingest | High (security) / Medium (contact) |
| D | L — blob store, scan, GDPR | High (security + ops) |
| E | M — but product-hard | High (CRM pollution, consent) |
| F | M — outbox + SSRF + log UI | Medium (ops); High if SSRF skipped |

---

# What “done” means for the epic (A–C)

A host who today uses **Tally + Sheet** for tennis can:

1. Build the form in Cohestra with slash-add (A).  
2. Track Instagram vs WhatsApp via `?ref=` (A).  
3. Show guest fields only when needed (B).  
4. Embed on the club page or take homepage inquiries (C).  

…and every path still writes a **person** Cohestra can campaign to.

D/E/F are not required for that sentence to be true.
