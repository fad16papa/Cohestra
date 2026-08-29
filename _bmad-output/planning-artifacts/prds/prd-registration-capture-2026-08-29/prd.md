---
title: Registration Capture
status: final
created: 2026-08-29
updated: 2026-08-29
sources:
  - _bmad-output/planning-artifacts/briefs/brief-cohestra-tally-forms-2026-08-27/brief.md
  - _bmad-output/planning-artifacts/cohestra-vs-tally-forms-2026-08-27/slices-elaborated.md
  - _bmad-output/planning-artifacts/cohestra-vs-tally-forms-2026-08-27/feasibility.md
  - _bmad-output/planning-artifacts/cohestra-vs-tally-forms-2026-08-27/prfaq.md
  - _bmad-output/planning-artifacts/prds/prd-registration-experience-studio-2026-08-12/prd.md
  - _bmad-output/planning-artifacts/prds/prd-registration-touchpoints-2026-08-16/prd.md
  - docs/contracts/activity-form-schema-v1.md
  - _bmad-output/planning-artifacts/prds/prd-registration-capture-2026-08-29/form-authoring-tiers.md
---

# PRD: Registration Capture

*Working title confirmed by the Tally.so study (2026-08-27/28). This is a **new** epic — not a reopen of Registration Experience Studio (Epic 25).*

## 0. Document Purpose

This PRD is for PM, UX, architecture, and epic/story authors. It turns the Cohestra vs Tally.so study into a requirement contract: **steal Tally’s event-signup authoring speed; keep Cohestra’s identity wedge.**

Structure: Glossary-anchored vocabulary, Features with globally numbered **FR-RC-*** IDs (namespaced so they do not collide with Registration Touchpoints **FR-1–FR-4** or Studio **FR-RES-***), User Journeys **UJ-RC-***, Success Metrics **SM-RC-***. `[ASSUMPTION]` tags are indexed in §9. Mechanism, rejected alternatives, and schema examples live in `addendum.md`.

**Builds on, does not replace:**
- Studio — Design tab, Community Brand Kit, `registration_theme` **separate from** `form_schema` (FR-RES-2.1).
- Touchpoints — confirmation email hero via `RegistrationThemeResolver` (do not fork).
- Base CRM — one Form per Activity (FR-2), public submit → Registration + Client dedup (FR-4), Publish Gate.

**Slice write-up (acceptance detail):** `_bmad-output/planning-artifacts/cohestra-vs-tally-forms-2026-08-27/slices-elaborated.md`.  
**Plan tiers for authoring + saved templates:** `form-authoring-tiers.md` (same folder). **Plan registration/seat caps stay as shipped** — Tally fair-use uncapping was considered and rejected.

---

## 1. Vision

Tally.so wins the blank page: type `/`, publish, paste a link on Instagram. Cohestra already wins the **second event** — a Registration writes a **Client** Cohestra can campaign to — but only if the first Form was created here. Hosts who cannot pass `?ref=whatsapp`, write a long note, or close a full session with their own copy open Tally in ten minutes. The guest list lands in a Sheet. Next month the same people register again. Cohestra would have caught that. They never put them in.

This epic makes the Activity Form Tally-fast to **author** without becoming a form product. Every submit still upserts a **deduped Client**. Surveys, NPS, and “Notion as CRM” stay on Tally. Saturday’s session should not.

**Thesis:** Tally is a document that emits rows. Cohestra is a Registration that emits a **person**. We will not out-Notion Tally. We will make the event job complete enough that Tally is for surveys, not “who’s coming Saturday.”

---

## 2. Target User

### 2.1 Jobs To Be Done

- **Operator (Core/Pro):** Author Saturday’s signup in Cohestra as fast as in Tally — Hidden Field, long text, date, closed copy — and get an email when someone registers. Stop pasting tally.so on Instagram.
- **Operator (Basic):** One recurring Activity; stay off Google Forms / Tally for that one Form.
- **Participant:** QR or shared link → one-thumb Form → confirmation. Not a Typeform interview.
- **Platform:** Additive `form_schema` only. Field id remains the CRM key. No second form product.

### 2.2 Non-Users (v1)

- Survey / research teams who need NPS, matrix, ranking, CSAT.
- Hosts whose system of record is a Sheet (we sell against that; we do not export-to-Sheet as the product).
- Ticket buyers paying inside the Form (ticketing / Paddle-for-registrants is a different epic).
- Operators who want a general logic IDE or a drag-and-drop canvas.

### 2.3 Key User Journeys

- **UJ-RC-1. Francis authors Saturday tennis without opening Tally.**
  - **Persona + context:** Francis, Core Operator, used Tally last month because the Form tab felt like IT.
  - **Entry state:** Authenticated; Activity detail → Form tab; Activity unpublished or draft Form.
  - **Path:** Types `/` → adds Email, Phone, Long text, Date, Hidden Field `ref` → writes closed message → publishes (Publish Gate still requires required Phone or Email).
  - **Climax:** Public link works; he copies `?ref=wa` onto Instagram.
  - **Resolution:** Next Participant submit is a Registration + Client in Cohestra, not a Tally row.
  - **Edge case:** He still has the old type dropdown as fallback if slash palette misses.

- **UJ-RC-2. Maya registers from an Instagram campaign link.**
  - **Persona + context:** Maya, first-timer, taps Francis’s Instagram bio.
  - **Entry state:** Unauthenticated mobile; URL includes `?ref=wa`.
  - **Path:** Fills name, phone, notes, preferred date → submits → sees “See you Saturday, Maya.”
  - **Climax:** Confirmation email uses the same piping token and the **Resolved registration theme** hero (Touchpoints FR-1 — unchanged).
  - **Resolution:** Francis’s inbox gets “New registration · Saturday tennis · Maya”; admin Registration shows `ref = wa`.
  - **Edge case:** `?ref=` missing → Hidden Field empty; submit still succeeds.

- **UJ-RC-3. Session is full; Francis’s copy shows.**
  - **Persona + context:** Capacity reached Friday night.
  - **Entry state:** Public `/register/saturday-tennis`.
  - **Path:** Maya opens the link after the last slot is taken (or after Close-at).
  - **Climax:** Operator-written “Waitlist opens Monday on WhatsApp” — not only platform “Full.”
  - **Resolution:** Submit is rejected server-side; capacity still wins.

- **UJ-RC-4. Guest name only when they bring a plus-one.** *(Phase 2)*
  - **Persona + context:** Francis adds “Bringing a guest?” + Recipe on guest name.
  - **Entry state:** Public Form, single page or optional steps.
  - **Path:** Maya selects No → guest name hidden and not required. Selects Yes → guest name required.
  - **Climax:** Submit with Yes + empty guest fails; No + empty guest succeeds.
  - **Resolution:** Server dropped any spoofed guest name while the Field was hidden.

- **UJ-RC-5. Form lives where the audience already is.** *(Phase 3)*
  - **Persona + context:** Club Notion page / Cohestra website homepage.
  - **Entry state:** Francis copies Share kit embed, or adds Contact section.
  - **Path:** Visitor fills embed or Contact → submit.
  - **Climax:** Embed creates Registration + Client; Contact creates Client + website inquiry (no Activity).
  - **Resolution:** Francis does not paste a Tally embed.

---

## 3. Glossary

Downstream must use these terms exactly.

- **Activity** — Schedulable community event. Has one **Form**.
- **Form** — The Activity’s `form_schema` (JSONB): ordered Fields. Not a standalone form product.
- **form_schema** — Frozen v1 JSON contract (`docs/contracts/activity-form-schema-v1.md`). This epic adds types/keys additively; `version` stays `1`.
- **Field** — One `form_schema.fields[]` object. **Field id** is the stable key in Registration Answers and the CRM extract key (lowercase `a-z`, `0-9`, `_`, `-`; max 64).
- **Field type** — v1 enum today: `text`, `phone`, `email`, `select`, `checkbox`, `consent`, `referral_source`, `section_header`. This epic adds `textarea`, `date`, `hidden` (MVP); `file` is deferred.
- **Hidden Field** — Field type `hidden`. Not shown to the Participant. Value from query string key matching Field id, or operator default.
- **Answer** — Submitted value keyed by Field id, stored on `registrations.answers`. Immutable after submit (existing platform rule; historical JSONB is never rewritten).
- **Form tab** — Admin Activity surface for editing the Form (list editor, not a canvas).
- **Publish Gate** — Activity cannot publish unless the Form has at least one **required** Phone or Email Field.
- **Client** — Deduped person (phone/email). A Registration upserts a Client.
- **Registration** — One Participant submit against one Activity. Links Client + Answers.
- **Operator** — Authenticated tenant admin.
- **Participant** — Unauthenticated person on the public Form.
- **Piping token** — Placeholder in thank-you copy or confirmation email (`{{full_name}}`, `{{email}}`, `{{phone}}`, `{{field:<id>}}`).
- **Closed message** — Operator-written copy shown when the Form is unavailable (full, paused, ended, or past Close-at).
- **Close-at** — Optional datetime after which the public Form rejects new Registrations (server-evaluated).
- **Recipe** — Named `visibleWhen` preset (guest, dietary, member, visitor) or custom equals/notEquals. Not a logic IDE.
- **Embed** — Chrome-light public Form for one Activity, framed on a foreign origin.
- **Contact section** — Website builder section that creates a Client (no Registration / no Activity).
- **Website inquiry** — Timeline event on a Client created from a Contact section.
- **Resolved registration theme** — Output of `RegistrationThemeResolver` (Studio + Touchpoints). Stored in `registration_theme`, **not** in `form_schema`.
- **Outbox** — Existing async email pipeline (SendGrid). Registration confirmation already uses it.

---

## 4. Features

### 4.1 Hidden Field and campaign query passthrough (MVP)

**Description:** Operators add Hidden Fields (`ref`, `utm_source`, …). The public Form reads matching query keys and writes them into Answers on submit. Realizes UJ-RC-1, UJ-RC-2. Tally’s Hidden Fields are free and are why hosts wrap Cohestra with Tally just for attribution.

**Functional Requirements:**

#### FR-RC-1: Hidden Field type

An Operator can add a Hidden Field on the Form tab. The Participant never sees an input. Realizes UJ-RC-1.

**Consequences (testable):**
- `form_schema` accepts `type: "hidden"`; unknown types still reject.
- Public renderer does not show an input for Hidden Fields (admin preview may show a “Hidden · filled from link” chip).
- Hidden Fields never satisfy the Publish Gate.
- `ClientProfileExtractor` does not map Hidden Field values into Client name, phone, or email.

#### FR-RC-2: Query passthrough into Answers

On public GET/submit, each Hidden Field id is filled from the request query (and later from Embed parent query). Unknown query keys are ignored. Realizes UJ-RC-2.

**Consequences (testable):**
- Submit from `?ref=wa` with Hidden Field id `ref` persists `answers.ref = "wa"`.
- Missing query → empty or operator `defaultValue`; submit still succeeds.
- Values stripped of HTML; max length 200 per value.
- Admin Registration detail **and** Client answer history show the Hidden Field Answer. Report/campaign filters are out of MVP (later).
- Public Form chrome is unchanged when Hidden Fields exist (no attribution UI for the Participant).

### 4.2 Long text and date (MVP)

**Description:** Additive Field types for notes and a preferred session date. No date math. Realizes UJ-RC-1, UJ-RC-2.

#### FR-RC-3: textarea Field

An Operator can add Field type `textarea`. Participant sees a multi-line input. Realizes UJ-RC-1.

**Consequences (testable):**
- Schema save, preview, publish, submit, admin Answers round-trip.
- Max length enforced (2000). XSS-safe when displayed in admin.
- Client extract follows the same name heuristics as `text`; otherwise Answers only.

#### FR-RC-4: date Field

An Operator can add Field type `date`. Stored as `YYYY-MM-DD`. Realizes UJ-RC-1.

**Consequences (testable):**
- Invalid date rejected on submit.
- Not mapped to a Client column in this epic.
- No min/max, no “disable Sundays,” no ranges.

#### FR-RC-18: Event toolbox Wave 1

The Form accepts additive types `number`, `url`, `time`, `choice`, `yes_no`, `multi_choice`, and display-only `info`. Catalog: `form-component-toolbox.md`. All plans. Realizes UJ-RC-1.

**Consequences (testable):**
- `number` rejects non-numeric; optional min/max.
- `url` requires `http` or `https`.
- `time` stores `HH:mm`.
- `choice` is single-select with large tap targets; `multi_choice` allows several; `yes_no` stores boolean.
- `info` is NonInput (no Answer); markdown-lite, max 2000.
- None of these satisfy the Publish Gate.

### 4.3 Piping on thank-you and confirmation email (MVP)

**Description:** Thank-you screen and confirmation email substitute Piping tokens from Answers or Client extract. Does **not** redesign the email layout (Touchpoints non-goal). Hero still comes from Resolved registration theme. Realizes UJ-RC-2.

#### FR-RC-5: Piping tokens

Operator-authored success copy and confirmation subject/body may include `{{full_name}}`, `{{email}}`, `{{phone}}`, `{{field:<id>}}`. Realizes UJ-RC-2.

**Consequences (testable):**
- Success screen shows the Participant name from the name Field without hardcoding.
- Confirmation email body/subject substitute the same token set.
- Missing value → empty string or fallback “there” (one rule, tested).
- Hidden Field values are never substituted into **Participant-visible** surfaces (success screen **and** confirmation email). Admin Registration detail and Operator notify may include them.

### 4.4 Closed message and Close-at (MVP)

**Description:** When the Form is unavailable, show Operator copy. Optional Close-at is independent of Activity end. Capacity full still wins. Realizes UJ-RC-3.

#### FR-RC-6: Closed message

An Operator can set `form_schema.meta.closedMessage`. Public unavailable state prefers it when present, and still shows a reason chip (Full / Closed / Paused). Realizes UJ-RC-3.

**Consequences (testable):**
- Full Activity with Closed message “Waitlist opens Monday on WhatsApp” shows that text.
- Empty Closed message → existing platform copy.
- Max length 2000. Plain text or markdown-lite; no images (NFR-RC-3). XSS-sanitized on public render.

#### FR-RC-7: Close-at

An Operator can set `form_schema.meta.registrationClosesAt`. Server evaluates on public GET and submit. Realizes UJ-RC-3.

**Consequences (testable):**
- Stored as a UTC instant; Operator picker displays in the **Activity timezone**.
- Empty Close-at = no datetime close (capacity / paused / ended still apply).
- After Close-at, public GET is unavailable and submit is rejected (server clock).
- Unavailable **precedence:** capacity full → paused → Close-at → Activity ended → platform default. Reason chip matches the winning reason; Closed message still shows when set.
- Operator can clear Close-at. Past Close-at at save is allowed (Form is already closed).

### 4.5 Slash-add on the Form tab (MVP)

**Description:** Tally muscle memory for Operators without violating UX-DR32 / UX-DR24. List editor remains. Realizes UJ-RC-1.

#### FR-RC-8: Slash / plus Field palette

On the Form tab, `/` or **+** opens a palette grouped as a **toolbox** (see `form-component-toolbox.md`): Text, Long text, Number, Email, Phone, Link, Date, Time, Yes/No, Choice, Dropdown, Multi-choice, Checkbox, Consent, Referral, Country, Section, Info, Hidden. Core+ adds Scale and Emergency contact. Keyboard: arrows + Enter; Esc closes. Existing type dropdown remains as fallback. Reorder stays grip / up-down (not a canvas). Realizes UJ-RC-1.

**Consequences (testable):**
- Operator can add Email + Hidden Field without using the type `<select>` as the primary path.
- Wave 1 types (`textarea`, `date`, `hidden`, `number`, `url`, `time`, `choice`, `yes_no`, `multi_choice`, `info`) save, preview, publish, submit, and show in admin Answers (`info` is display-only).
- No drag-and-drop canvas, no column layout, no “typed prose becomes a Field.”
- NPS, matrix, ranking, payment are not in the palette.

### 4.6 Operator notification on new Registration (MVP)

**Description:** Tally’s “you get the lead” loop without webhooks. Uses Outbox. Realizes UJ-RC-2.

#### FR-RC-9: Operator new-Registration email

On successful public submit, enqueue Outbox `RegistrationOperatorNotify` to the tenant admin contact. Realizes UJ-RC-2.

**Consequences (testable):**
- Guest submit → Operator inbox receives mail within Outbox processing.
- Subject includes Activity title and Participant name or phone.
- Body includes name, phone, email, and a link to Activity → Registrations.
- Does not fire on Form field edits or draft saves.
- `[ASSUMPTION]` Default **on**; Settings → Notifications toggle “Email me on new registrations.” To: tenant admin contact (`AdminContactEmail`).

**Out of Scope:** Slack native, per-Activity mute, digest batching.

### 4.7 Recipes — visibleWhen (Phase 2)

**Description:** Event-shaped show/hide without a logic IDE. If a story needs nested AND/OR, **stop**. Realizes UJ-RC-4.

#### FR-RC-10: visibleWhen recipes

A Field may include `visibleWhen: { fieldId, equals | notEquals }`. Operator UX is presets (guest name, dietary, member ID, visitor company) plus custom pick Field + value. Realizes UJ-RC-4.

**Consequences (testable):**
- Hidden-while-invisible Fields are not rendered and not required.
- Server re-validates visibility; spoofed Answers for invisible Fields are dropped.
- Guest name required only when bringing-guest equals yes; No + empty guest succeeds; Yes + empty guest fails.
- Circular Recipes rejected at Form save.
- Publish Gate unchanged.

**Out of Scope:** Nested AND/OR groups, calculate, jump-to-page graph, regex, “contains.”

### 4.8 Optional Identity → Details → Consent (Phase 2)

**Description:** Optional stepper; default remains single page (QR-at-the-door). Not Typeform. Realizes UJ-RC-4.

#### FR-RC-11: Optional steps

Operator toggle “Split into steps” groups Fields into Identity / Details / Consent. Next / Back; validate current step; one submit on last step. Off = today’s single page. `[ASSUMPTION]` Steps only when the toggle is on — not auto-enabled by Field count. Realizes UJ-RC-4.

**Assignment rule:** On toggle-on, auto-bucket by Field type — name / phone / email → Identity; consent → Consent; else Details. Operator may move a Field between steps **inside the list editor** (not a canvas). Step labels default Identity / Details / Consent.

**Consequences (testable):**
- 10-Field Form with toggle on → three steps → submit creates Client identical to single-page.
- Toggle off → no stepper chrome. Public default remains one page (Participant one-thumb / QR-at-the-door).
- Preview shows steps and the assigned bucket for each Field.

### 4.9 Activity Embed (Phase 3)

**Description:** One Activity’s public Form on a foreign page. Highest Tally-replacement feature and highest XSS/CSP risk. Do not start before MVP. Realizes UJ-RC-5.

#### FR-RC-12: Embed route and snippet

Share kit offers iframe (and optional popup script) for a chrome-light `/embed/register/{slug}`. Same submit API. Parent query string feeds Hidden Fields (FR-RC-2). `postMessage` height resize. Realizes UJ-RC-5.

**Consequences (testable):**
- iframe on another origin shows the Form, submits, Registration appears in Cohestra.
- Admin chrome is not embeddable.
- `[ASSUMPTION]` Tenant **Allowed embed hosts** (`allowedEmbedOrigins`) required before any `frame-ancestors` relaxation; no open `*` in v1 of this feature.

**Feature-specific NFRs:**
- Relax CSP / `X-Frame-Options` **only** on the Embed route.
- Rate limits on public submit stay.
- Deploy docs updated in lockstep with nginx/CSP.

### 4.10 Website Contact section (Phase 3)

**Description:** Homepage contact without inventing a fake Activity. Closes “I only wanted a contact form.” Realizes UJ-RC-5.

#### FR-RC-13: Contact section → Client

Website builder section with a **fixed** Field set (name, email, phone, message, consent checkbox). Operator authors heading, intro, button label, and success message — not a Form tab. Submit upserts a Client (`LeadStatus = New`) and writes a Website inquiry timeline event. No Registration. Dedup by phone/email like public Registration. `[ASSUMPTION]` Gated Core/Pro like the website builder. Realizes UJ-RC-5.

**Consequences (testable):**
- Published homepage Contact submit creates a Client without an Activity Registration.
- Duplicate phone/email updates the existing Client.
- Consent unchecked → Client is created; marketing opt-in is **not** set. Consent checked → marketing opt-in set.
- Enqueues sibling Outbox `WebsiteInquiryOperatorNotify` (not `RegistrationOperatorNotify`).
- `[ASSUMPTION]` Endpoint shape `POST /api/v1/public/website-inquiries` (tenant-scoped host).

**Out of Scope:** Full Form tab on website sections; logic on Contact; multi-form library detached from this Contact section.

### 4.11 Saved Form templates (MVP follow — all plans, slot-gated)

**Description:** Today Operators start from three **platform** launch templates and cannot save their own. Freedom to design a Form means **compose Fields freely** (slash-add + Capture types) and **reuse that composition** — not a canvas and not custom CSS. Realizes UJ-RC-1 on the second Activity. Detail: `form-authoring-tiers.md`.

#### FR-RC-15: Save and apply tenant Form templates

An Operator can save the current draft `form_schema` (fields + meta) as a named tenant Form template and apply it to another unpublished Activity (replaces draft Fields after confirm, same as launch templates). Realizes UJ-RC-1.

**Consequences (testable):**
- Save stores name + `form_schema` snapshot scoped by `TenantId`.
- Apply on a published Activity stays locked (same as launch templates).
- Publish Gate still runs on the Activity after apply.
- Platform launch templates (Tennis, Pickleball, Board Game) remain available on every plan.

#### FR-RC-16: Template slots by plan

Slot counts: **Basic 1**, **Core 5**, **Pro 25**. Exceeding the cap returns `403 plan_locked`. Realizes monetization without changing registration caps.

**Consequences (testable):**
- Basic cannot create a second template.
- Core sixth save is `plan_locked` with upgrade hint.
- Pro 26th save is `plan_locked`.
- Downgrade: existing templates remain readable; Operator cannot save new ones until under the new cap (same pattern as activity limits).

#### FR-RC-17: Core community default + Pro Design pin

Core+ can set one Saved Form template as the default for a Community (new Activities pre-fill that schema). Pro can pin a Design preset id on a template; applying offers to set that preset on the Activity (Operator confirms). Basic has neither.

**Consequences (testable):**
- Basic API rejects community-default and preset-pin.
- Core can set community default; pin endpoint is `plan_locked`.
- Theme is never written into `form_schema` (FR-RC-14).

### 4.12 Invariants (all phases)

#### FR-RC-14: Capture contract unchanged

Publish Gate, Client dedup, Answer immutability, one Form per Activity, and **shipped plan limits** (`TenantPlanLimits`: 250 / 500 / 5,000 registrations per month, plus seat / community / activity caps) remain. Tally-style fair-use uncapping is out. Realizes UJ-RC-1–5.

**Consequences (testable):**
- Publish still requires a required Phone **or** Email Field (unit tests on `PublishGateValidator` / `FormSchemaValidator`).
- Existing Activities with v1 types remain valid without migration.
- `registration_theme` is not written into `form_schema`.
- Confirmation email hero still uses `RegistrationThemeResolver` (Touchpoints FR-1).

---

## 5. Non-Goals (Explicit)

- **Clone Tally** — no 20+ Field types (NPS, matrix, ranking, CSAT), no document-as-product.
- **Logic IDE** — no nested `/logic`, calculate, or jump graph. Recipes only (Phase 2).
- **Drag-and-drop Form canvas** — UX-DR32 / UX-DR24 stand. Slash-add + saved templates are the Tally steal, not a designer.
- **Tally-style fair-use / uncapped registrations** — rejected 2026-08-29; keep `TenantPlanLimits`.
- **Registrant checkout** — no Stripe-in-form; Paddle is tenant billing only.
- **Custom CSS / custom fonts / custom domain** — NFR-12 / UX-DR26; Studio already covers brand.
- **Sheets or Notion as system of record.**
- **Tally JSON import** (v1).
- **Webhook-only Tally integration as the strategy** — keeps Tally as source of truth.
- **Reopen Studio** for embed/logic as branding work. Those Studio non-goals stay; this epic owns the narrow reopen.
- **Redesign confirmation email layout** — piping tokens only; hero contract is Touchpoints.
- **File upload, draft-as-Client, HMAC tenant webhooks** — deferred (D / E / F). See addendum.
- **Typeform one-question-per-page as default.**
- **Incoming webhooks** (public POST into Cohestra from arbitrary origins).

---

## 6. MVP Scope

### 6.1 In Scope (Slice A / MVP)

- Hidden Field + query passthrough (FR-RC-1, FR-RC-2)
- `textarea`, `date` (FR-RC-3, FR-RC-4) plus Wave 1 toolbox: `number`, `url`, `time`, `choice`, `yes_no`, `multi_choice`, `info`
- Piping tokens on thank-you + confirmation email (FR-RC-5)
- Closed message + Close-at (FR-RC-6, FR-RC-7)
- Slash-add Form tab (FR-RC-8)
- Operator new-Registration email (FR-RC-9)
- Invariants (FR-RC-14) including **unchanged** registration/seat/activity caps
- Saved Form templates, slot-gated (FR-RC-15–17) — ship with or immediately after slash-add
- Contract doc bump: additive types on `form_schema` version `1`
- Unit tests: `FormSchemaValidator`, `RegistrationAnswerValidator`, `ClientProfileExtractor`, Publish Gate, template slot `plan_locked`

### 6.2 Out of Scope for MVP

- Recipes + optional steps — **Phase 2** (FR-RC-10, FR-RC-11). After MVP schema bump.
- Embed + Contact section — **Phase 3** (FR-RC-12, FR-RC-13). Do not start before MVP. Embed is security-gated.
- Bot friction (Turnstile/reCAPTCHA) — **not** in MVP stories. Revisit when public spam appears (§8 Q1).
- File upload (D), draft-as-Client (E), HMAC webhooks (F) — later / maybe. E default is **off**.
- Slack, Zapier-out, Tally import.

---

## 7. Success Metrics

**Primary**
- **SM-RC-1:** Operators stop opening Tally for **event signup**. Method: (a) tag support/churn reasons “needed Tally for Saturday”; (b) count published Activities that use at least one new MVP capability (Hidden Field, textarea, date, or Closed message) in the 30 days after ship. Validates FR-RC-1–8.
- **SM-RC-2:** Campaign links with `?ref=` produce a Registration Answer `ref` visible on Registration detail and Client answer history. Target: 100% of submits from a parameterized link when the Hidden Field exists. Validates FR-RC-2.

**Secondary**
- **SM-RC-3:** Publish Gate completion does not drop (same required Phone-or-Email rule). Validates FR-RC-14.
- **SM-RC-4:** *(Phase 3)* Hosts paste Cohestra Embed instead of Tally for Activities. Method until telemetry exists: Operator interview / Share kit copy check — not a dashboard KPI. Validates FR-RC-12.
- **SM-RC-5:** Operators apply a **saved** Form template to a second Activity within 30 days of first save. Validates FR-RC-15.

**Counter-metrics (do not optimize)**
- **SM-RC-C1:** Number of Field types in the palette — more types is not success (that is cloning Tally).
- **SM-RC-C2:** Number of Recipe operators / nesting depth — if this grows, we are building a logic IDE.
- **SM-RC-C3:** Webhook/Zapier adoption as a substitute for in-app capture — that trains Tally-as-source-of-truth.

---

## 8. Open Questions

1. **Bot friction provider** — Turnstile vs reCAPTCHA vs none. Not in MVP stories. Owner: platform. Revisit when public spam appears.
2. **Operator notify recipient** — Activity owner email when present? Locked for MVP: tenant `AdminContactEmail` only. Revisit if Operators miss Activity-scoped mail.
3. **Piping fallback word** — empty vs “there.” Pick one in implementation and test; not a product fork.
4. **Phase 2 auto-steps** — study mentioned “or Field count ≥ 10.” Locked: **toggle only**. Revisit if Operators never find the toggle.
5. **Phase 3 Embed snippet set** — iframe-only vs iframe + popup script in first Embed story. `[ASSUMPTION]` iframe first.

None of these block MVP stories. Phase 3 Contact consent is **locked** in FR-RC-13 (checkbox present; marketing opt-in only when checked).

---

## 9. Assumptions Index

Inline `[ASSUMPTION]` tags (review these):

- FR-RC-9 default on + Settings toggle; To: tenant admin contact.
- FR-RC-11 steps only when toggle on — not auto by Field count.
- FR-RC-12 Allowed embed hosts; no `frame-ancestors *`; iframe first (also §8 Q5).
- FR-RC-13 Core/Pro; `POST /api/v1/public/website-inquiries`; no Activity.
- Slice A field types on every plan that has the Form tab; template **slots** are the SKU (FR-RC-16).

Locked in this PRD / memlog (not open inferences — no inline tag):

- Fast path / Vision+Features after “ok bmad-prd.”
- MVP = Slice A; Phase 2 = B; Phase 3 = C.
- `form_schema` `version` stays `1`; document additive types as v1.1.
- Slice A available on every plan that already has the Form tab.
- Bot friction **not** in MVP stories.
- Draft-as-Client (E) remains **off**.

---

## 10. Why Now

Tally’s free plan includes Hidden Fields, answer piping, email notifications, embed, and conditional logic. That is the default “I’ll just make a form” move. Cohestra already shipped Studio (looks like the club) and Touchpoints (email matches the page). The remaining leak is **authoring + attribution + closed copy**. Every week a host starts in Tally is a Client graph we never get.

---

## 11. Cross-Cutting NFRs

- **NFR-RC-1 (contract):** Additive `form_schema` only. Unknown types reject. Existing Activities unchanged. Field id remains the CRM key.
- **NFR-RC-2 (compat):** `registration_theme` stays off `form_schema`. Touchpoints resolver unchanged.
- **NFR-RC-3 (a11y):** Public Form and slash palette meet existing WCAG 2.2 AA on registration surfaces (enterprise NFR-12). Closed message is not image-only. Public Form stays a one-thumb / QR flow — single page unless the Phase 2 toggle is on; Hidden Fields do not add Participant chrome.
- **NFR-RC-4 (tenant isolation):** Answers, Hidden Fields, Close-at, Operator notify, and Saved Form templates scoped by `TenantId`. SM-style isolation tests extended.
- **NFR-RC-5 (perf):** Public GET/submit remain single-payload; Hidden Field query parse is O(fields).
- **NFR-RC-6 (email):** Operator notify and confirmation stay on Outbox + SendGrid; registration notification emails remain available on all plans (enterprise FR-16).
- **NFR-RC-7 (security, Phase 3):** Embed CSP allow-list; clickjacking documented. Webhook SSRF (if F ever ships) is addendum, not MVP.

---

## 12. Constraints and Guardrails

**Safety / UX**
- UX-DR32 / UX-DR24: no Form canvas. UX-DR20: public IA remains `/register/{slug}` → registration | confirmation | unavailable.
- Public default stays single-page until Phase 2 toggle.

**Privacy**
- Hidden Field values may be campaign refs, not PII. Do not encourage emails in query strings (logged at the edge). Document this for Operators.
- Answers remain immutable; no silent rewrite of historical JSONB.
- Draft-as-Client deferred because it stores PII before consent.

**Cost**
- No new vendor required for MVP (Outbox exists). Bot challenge keys optional.

---

## 13. Integration and Dependencies

| Depends on | How |
|---|---|
| `form_schema` v1 + validators | Additive types/keys |
| Form tab / `FormFieldEditor` | Slash palette + save/apply templates |
| Public `RegistrationForm` + `POST /api/v1/public/registrations` | Render + submit |
| `ClientProfileExtractor`, Publish Gate | Skip Hidden; keep phone-or-email |
| Outbox + confirmation email builder | Piping + Operator notify |
| `RegistrationThemeResolver` | Do not fork hero |
| Website builder (Phase 3) | Contact section |
| nginx + `web/content-security-policy.ts` (Phase 3) | Embed CSP |

---

## 14. Risk and Mitigations

| Risk | Mitigation |
|---|---|
| Scope creep into Jotform | Recipes-only stop rule; SM-RC-C2 |
| Embed clickjacking | Allow-list origins; no `*` |
| Operator notify spam | Toggle; no notify on edits; digest later if volume hurts |
| Schema freeze broken | version stays 1; unknown types still reject |
| Studio/Touchpoints regression | FR-RC-14; theme not in `form_schema` |
| Hosts still open Tally for one-off RSVPs | Accept; win recurring Activities |

---

## 15. Platform and Monetization

- **Platform:** Web — admin (Next.js) + public registration. Phase 3 adds Embed route + website section.
- **Monetization:** Registration / seat / community / activity **caps stay as shipped**. We do not adopt Tally fair-use uncapping. Capture field types (Slice A) stay on every plan that has the Form tab. **Saved Form templates** are the paid differentiator: Basic 1 / Core 5 / Pro 25, plus Core community default and Pro Design pin (FR-RC-16–17). Phase 3 Contact follows website-builder plan gates. HMAC webhooks (F), if ever, are Pro.

---

## 16. Data Governance

- Registration Answers (including Hidden Fields) are tenant-scoped PII-adjacent; retention follows existing Client/Registration deletion.
- Close-at and Closed message are Operator content; sanitize for XSS on public render.
- Phase 3 Contact writes Client + Website inquiry; same dedup and deletion story.
- Deferred file blobs need object-store retention + GDPR delete (addendum D) — not MVP.

---

## 17. Epic mapping (downstream)

| Phase | Stories (suggested) | FRs |
|---|---|---|
| **MVP / Slice A** | Hidden + UTM · textarea · date · Wave 1 toolbox · piping · closed copy + Close-at · slash-add · Operator notify · **saved templates (1/5/25)** | FR-RC-1–9, FR-RC-14–18 |
| **Phase 2 / Slice B** | Recipes · optional steps | FR-RC-10–11 |
| **Phase 3 / Slice C** | Embed · Contact section | FR-RC-12–13 |
| **Later** | File · draft-as-Client (default off) · HMAC webhook | addendum D/E/F |

Next skills: `bmad-ux` (Form tab slash-insert only — no canvas), `bmad-spec` for additive `form_schema`, `bmad-create-epics-and-stories`.
