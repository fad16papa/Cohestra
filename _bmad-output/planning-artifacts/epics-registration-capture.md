---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-registration-capture-2026-08-29/prd.md
  - _bmad-output/planning-artifacts/prds/prd-registration-capture-2026-08-29/addendum.md
  - _bmad-output/planning-artifacts/prds/prd-registration-capture-2026-08-29/form-authoring-tiers.md
  - _bmad-output/planning-artifacts/prds/prd-registration-capture-2026-08-29/form-component-toolbox.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/architecture/architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-07-18/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-07-18/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-lead-generation-crm-2026-06-14/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-lead-generation-crm-2026-06-14/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-registration-experience-studio-2026-08-12/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-registration-experience-studio-2026-08-12/EXPERIENCE.md
workflowType: create-epics-and-stories
project_name: Registration Capture
user_name: Admin
date: '2026-08-29'
note: Brownfield increment. This file is the Capture inventory. Do not overwrite planning-artifacts/epics.md or epics-cohestra-enterprise.md.
---

# Registration Capture - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Registration Capture, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

**Thesis (locked):** Steal Tally event-signup authoring speed. Do not clone a form builder. Every submit still upserts a deduped Client.

**Epic cut (locked, Admin 2026-08-29):** Three sibling epics numbered **30 / 31 / 32** so they sit after shipped Paddle **29**. Saved templates are the last stories in Epic 30, not their own epic. Stories are written in a later step.

## Requirements Inventory

### Functional Requirements

FR-RC-1: An Operator can add a Hidden Field (`type: "hidden"`) on the Form tab. The Participant never sees an input. `form_schema` accepts `hidden`; unknown types still reject. Admin preview may show a “Hidden · filled from link” chip. Hidden Fields never satisfy the Publish Gate. `ClientProfileExtractor` does not map Hidden values into Client name, phone, or email.

FR-RC-2: On public GET/submit, each Hidden Field id is filled from the request query (and later from Embed parent query). Unknown query keys are ignored. `?ref=wa` with Hidden Field id `ref` persists `answers.ref = "wa"`. Missing query → empty or operator `defaultValue`; submit still succeeds. Values stripped of HTML; max length 200. Admin Registration detail and Client answer history show the Hidden Field Answer. Public Form chrome is unchanged (no attribution UI for the Participant). Report/campaign filters on Hidden Answers are out of MVP.

FR-RC-3: An Operator can add Field type `textarea`. Participant sees a multi-line input. Schema save, preview, publish, submit, and admin Answers round-trip. Max length 2000. XSS-safe when displayed in admin. Client extract follows the same name heuristics as `text`; otherwise Answers only.

FR-RC-4: An Operator can add Field type `date`. Stored as `YYYY-MM-DD`. Invalid date rejected on submit. Not mapped to a Client column in this epic. No min/max, no “disable Sundays,” no ranges.

FR-RC-5: Operator-authored success copy and confirmation subject/body may include Piping tokens `{{full_name}}`, `{{email}}`, `{{phone}}`, `{{field:<id>}}`. Success screen shows the Participant name from the name Field without hardcoding. Confirmation email body/subject substitute the same token set. Missing value → empty string or fallback “there” (one rule, tested). Hidden Field values are never substituted into Participant-visible surfaces (success screen and confirmation email). Admin Registration detail and Operator notify may include them. Email layout and hero stay on Touchpoints / `RegistrationThemeResolver` — piping only.

FR-RC-6: An Operator can set `form_schema.meta.closedMessage`. Public unavailable state prefers it when present and still shows a reason chip (Full / Closed / Paused). Empty Closed message → existing platform copy. Max length 2000. Plain text or markdown-lite; no images. XSS-sanitized on public render.

FR-RC-7: An Operator can set `form_schema.meta.registrationClosesAt`. Server evaluates on public GET and submit. Stored as a UTC instant; Operator picker displays in the Activity timezone. Empty Close-at = no datetime close (capacity / paused / ended still apply). After Close-at, public GET is unavailable and submit is rejected (server clock). Unavailable precedence: capacity full → paused → Close-at → Activity ended → platform default. Reason chip matches the winning reason; Closed message still shows when set. Operator can clear Close-at. Past Close-at at save is allowed.

FR-RC-8: On the Form tab, `/` or **+** opens a palette grouped as a toolbox (see `form-component-toolbox.md`): Text, Long text, Number, Email, Phone, Link, Date, Time, Yes/No, Choice, Dropdown, Multi-choice, Checkbox, Consent, Referral, Country, Section, Info, Hidden. Core+ adds Scale and Emergency contact. Keyboard: arrows + Enter; Esc closes. Existing type dropdown remains as fallback. Reorder stays grip / up-down (not a canvas). Operator can add Email + Hidden Field without using the type `<select>` as the primary path. No drag-and-drop canvas, no column layout, no “typed prose becomes a Field.” NPS, matrix, ranking, and payment are not in the palette.

FR-RC-9: On successful public submit, enqueue Outbox `RegistrationOperatorNotify` to the tenant admin contact. Subject includes Activity title and Participant name or phone. Body includes name, phone, email, and a link to Activity → Registrations. Does not fire on Form field edits or draft saves. Default **on**; Settings → Notifications toggle “Email me on new registrations.” To: tenant `AdminContactEmail`. Out of scope: Slack native, per-Activity mute, digest batching.

FR-RC-10 (Phase 2): A Field may include `visibleWhen: { fieldId, equals | notEquals }`. Operator UX is named Recipes (guest name, dietary, member ID, visitor company) plus custom pick Field + value. Hidden-while-invisible Fields are not rendered and not required. Server re-validates visibility; spoofed Answers for invisible Fields are dropped. Guest name required only when bringing-guest equals yes; No + empty guest succeeds; Yes + empty guest fails. Circular Recipes rejected at Form save. Publish Gate unchanged. Stop if a story needs nested AND/OR, calculate, jump-to-page, regex, or “contains.”

FR-RC-11 (Phase 2): Operator toggle “Split into steps” groups Fields into Identity / Details / Consent. Next / Back; validate current step; one submit on last step. Off = today’s single page. Steps only when the toggle is on — not auto-enabled by Field count. On toggle-on, auto-bucket by Field type — name / phone / email → Identity; consent → Consent; else Details. Operator may move a Field between steps inside the list editor (not a canvas). Step labels default Identity / Details / Consent. 10-Field Form with toggle on → three steps → submit creates Client identical to single-page. Toggle off → no stepper chrome. Public default remains one page. Preview shows steps and the assigned bucket for each Field.

FR-RC-12 (Phase 3): Share kit offers iframe (and optional popup script) for a chrome-light `/embed/register/{slug}`. Same submit API. Parent query string feeds Hidden Fields (FR-RC-2). `postMessage` height resize. iframe on another origin shows the Form, submits, Registration appears in Cohestra. Admin chrome is not embeddable. Tenant `allowedEmbedOrigins` required before any `frame-ancestors` relaxation; no open `*` in v1. Relax CSP / `X-Frame-Options` only on the Embed route. Rate limits on public submit stay. Deploy docs updated in lockstep with nginx/CSP. iframe first.

FR-RC-13 (Phase 3): Website builder section with a **fixed** Field set (name, email, phone, message, consent checkbox). Operator authors heading, intro, button label, and success message — not a Form tab. Submit upserts a Client (`LeadStatus = New`) and writes a Website inquiry timeline event. No Registration. Dedup by phone/email like public Registration. Gated Core/Pro like the website builder. Duplicate phone/email updates the existing Client. Consent unchecked → Client is created; marketing opt-in is **not** set. Consent checked → marketing opt-in set. Enqueues sibling Outbox `WebsiteInquiryOperatorNotify` (not `RegistrationOperatorNotify`). Endpoint shape `POST /api/v1/public/website-inquiries` (tenant-scoped host). Out of scope: full Form tab on website sections; logic on Contact; multi-form library.

FR-RC-14: Publish Gate, Client dedup, Answer immutability, one Form per Activity, and shipped plan limits (`TenantPlanLimits`: 250 / 500 / 5,000 registrations per month, plus seat / community / activity caps) remain. Tally-style fair-use uncapping is out. Publish still requires a required Phone **or** Email Field. Existing Activities with v1 types remain valid without migration. `registration_theme` is not written into `form_schema`. Confirmation email hero still uses `RegistrationThemeResolver` (Touchpoints FR-1). Paddle is tenant billing; no Stripe-in-form / registrant checkout.

FR-RC-15: An Operator can save the current draft `form_schema` (fields + meta) as a named tenant Form template and apply it to another unpublished Activity (replaces draft Fields after confirm, same as launch templates). Save stores name + `form_schema` snapshot scoped by `TenantId`. Apply on a published Activity stays locked. Publish Gate still runs on the Activity after apply. Platform launch templates (Tennis, Pickleball, Board Game) remain available on every plan. Theme is never written into the template’s `form_schema`.

FR-RC-16: Saved template slot counts: Basic 1, Core 5, Pro 25. Exceeding the cap returns `403 plan_locked`. Basic cannot create a second template. Core sixth save is `plan_locked` with upgrade hint. Pro 26th save is `plan_locked`. Downgrade: existing templates remain readable; Operator cannot save new ones until under the new cap (same pattern as activity limits).

FR-RC-17: Core+ can set one Saved Form template as the default for a Community (new Activities pre-fill that schema). Pro can pin a Design preset id on a template; applying offers to set that preset on the Activity (Operator confirms). Basic has neither. Basic API rejects community-default and preset-pin. Core can set community default; pin endpoint is `plan_locked`. Theme is never written into `form_schema`.

FR-RC-18: The Form accepts additive Wave 1 types `number`, `url`, `time`, `choice`, `yes_no`, `multi_choice`, and display-only `info` on all plans. `number` rejects non-numeric; optional min/max. `url` requires `http` or `https`. `time` stores `HH:mm`. `choice` is single-select with large tap targets; `multi_choice` allows several; `yes_no` stores boolean. `info` is NonInput (no Answer); markdown-lite, max 2000. None of these satisfy the Publish Gate.

### NonFunctional Requirements

NFR-RC-1 (contract): Additive `form_schema` only. Unknown types reject. Existing Activities unchanged. Field id remains the CRM key. `version` stays `1`; document additive types as v1.1 on `docs/contracts/activity-form-schema-v1.md`.

NFR-RC-2 (compat): `registration_theme` stays off `form_schema`. Touchpoints `RegistrationThemeResolver` unchanged. Studio Design tab remains the look surface.

NFR-RC-3 (a11y): Public Form and slash palette meet existing WCAG 2.2 AA on registration surfaces (enterprise NFR-12). Closed message is not image-only. Public Form stays a one-thumb / QR flow — single page unless the Phase 2 toggle is on; Hidden Fields do not add Participant chrome.

NFR-RC-4 (tenant isolation): Answers, Hidden Fields, Close-at, Operator notify, and Saved Form templates scoped by `TenantId`. SM-style isolation tests extended. No template rows leak across tenants.

NFR-RC-5 (perf): Public GET/submit remain single-payload; Hidden Field query parse is O(fields). Public registration page remains interactive within the existing 2s-on-4G floor (platform NFR-1 / NFR-11).

NFR-RC-6 (email): Operator notify and confirmation stay on Outbox + SendGrid; registration notification emails remain available on all plans (enterprise FR-16). No new vendor required for MVP.

NFR-RC-7 (security, Phase 3): Embed CSP allow-list; clickjacking documented. Relax `frame-ancestors` / `X-Frame-Options` only on the Embed route. Webhook SSRF (if F ever ships) is addendum, not MVP.

NFR-RC-8 (inherited reliability): 100% of successful public Form submissions create a Registration and Client link synchronously (platform NFR-4). Registrations / Answers are immutable after submit (platform NFR-8). Historical JSONB is never rewritten.

NFR-RC-9 (inherited security): Public registration endpoints stay unauthenticated and Redis rate-limited (platform NFR-6). Admin Form tab, templates, and Settings notify toggle require JWT. RFC 7807 ProblemDetails on API errors.

NFR-RC-10 (privacy): Hidden Field values may be campaign refs, not PII. Do not encourage emails in query strings (logged at the edge). Document this for Operators. Draft-as-Client stays deferred (stores PII before consent).

### Additional Requirements

Brownfield — no starter / greenfield template. There is no Epic 1 Story 1 scaffold story. Implementation extends the existing .NET 9 API + Next.js web + PostgreSQL + Redis stack.

- API-first: all business rules in the ASP.NET Core API. Web is a thin client of `/api/v1/`. DTOs on the wire; never EF entities.
- Persistence: `activities.form_schema` and `registrations.answers` remain PostgreSQL JSONB. Field id is the stable key in Answers and CRM extract.
- Public tenant resolution: Host header `{slug}.cohestra.app` (AD-2). Public `/register/{slug}` resolves within the resolved tenant only. Composite uniqueness `UNIQUE (TenantId, Slug)` (AD-5).
- Admin auth: JWT Bearer with `tenant_id` claim (AD-3). No client-supplied `X-Tenant-Id`.
- Row-level tenant isolation on every tenant-owned table (AD-1). EF global query filters. Cross-tenant isolation integration tests (`TenantIsolation`) remain a release gate (AD-10) — extend to Hidden Answers, Close-at, Operator notify, and Saved Form templates.
- Plan gates enforced server-side (AD-8). `403 plan_locked` for template slots, Core+ toolbox types, community default, Design pin, Phase 3 Contact. Do not change `TenantPlanLimits` registration/seat/community/activity caps.
- Public POST `/api/v1/public/registrations` stays Redis rate-limited (sliding window per IP / fingerprint).
- Email: Outbox + SendGrid. New message type `RegistrationOperatorNotify`. Phase 3 sibling `WebsiteInquiryOperatorNotify`. Confirmation piping edits `RegistrationConfirmationEmailBuilder` only — do not fork the hero path.
- Errors: RFC 7807 ProblemDetails. 403 for plan gate or cross-tenant. 404 for unknown tenant slug / unpublished-unavailable as today.
- Contract bump: additive types/keys on `docs/contracts/activity-form-schema-v1.md` while `version` stays `1`.
- Code touchpoints (do not invent a second form product): `FormFieldTypes.cs`, `FormSchemaValidator.cs`, `PublishGateValidator.cs`, `RegistrationAnswerValidator.cs`, `ClientProfileExtractor.cs`, `web/lib/form-schema-utils.ts`, `web/lib/form-templates.ts`, `form-template-picker.tsx`, `activity-form-tab.tsx`, public `registration-form.tsx` + success/unavailable screens.
- Billing: Paddle is tenant billing. Architecture.md still documents Stripe historically; this epic does not add registrant checkout or Stripe-in-form.
- Phase 3 nginx + `web/content-security-policy.ts` must change in lockstep with Embed.
- No Capture-specific architecture run exists. Reuse platform architecture; do not start a parallel form service.

**Companion extras (confirmed input; not given FR-RC IDs in the PRD body):**

- Toolbox Wave 2 (all plans): `country` — ISO country list; reuse phone-country data; in the Always palette (FR-RC-8).
- Toolbox Wave 2 (Core+): `scale` (labeled 1–5 skill, not NPS) and `emergency` (compound `{ name, phone }`, one Field id). Basic API is `plan_locked`.
- Toolbox later (Pro, Slice D): `file`, `signature`. Not MVP.
- Toolbox never: NPS, CSAT, ranking, matrix, payment, calculated fields, video-in-form.
- Tiers: Pro may duplicate a saved template. Basic/Core may rename / replace / delete own templates.
- Tiers Phase 2 plan gate: Recipes on Core+; optional steps on Pro only. Basic has neither.
- Slice A field types ship on every plan that already has the Form tab; template **slots** are the SKU.
- Operator notify recipient locked for MVP: tenant `AdminContactEmail` only (not Activity owner).
- Bot friction (Turnstile/reCAPTCHA) is not in MVP stories.
- Deferred later: file/signature (D), draft-as-Client default **off** (E), HMAC tenant webhooks (F).
- No Tally JSON import, no webhook-only Tally integration, no incoming public webhooks from arbitrary origins.

### UX Design Requirements

No Capture-specific UX run exists. The following are extracted from the confirmed brownfield spines plus Capture-specific surfaces named in the PRD. Existing platform IDs are kept so stories bind to shipped components instead of inventing a second IA.

**Inherited — public Form and IA (must not regress)**

UX-DR9: `RegistrationForm` renders from Activity JSON schema. Public variant: full-width fields, 20px field gap, inline validation on blur, submit disabled until required fields + consent valid. Admin preview variant: bordered preview card. Single-page form unless Phase 2 toggle is on. Extend this component for new Field types — do not fork a second public form.

UX-DR10: `ActivityHero` on public registration only (name, schedule, location, community, optional 16:9 hero). Hidden on confirmation. Capture does not redesign hero; Closed/unavailable still sits under this chrome.

UX-DR18: `PublicFormLayout` — no nav, no auth chrome, centered column max 480px, minimum 20px side margins on mobile. Public routes must never render admin sidebar. Embed (Phase 3) is chrome-light on a dedicated route; admin chrome is not embeddable.

UX-DR20: Public IA remains `/register/{slug}` for registration, confirmation (post-submit), and unavailable. No tabs, account creation, or app download prompts. Capture adds reason chip + Closed message on unavailable; does not add new public IA for MVP.

UX-DR26: Per-activity public branding stays on Studio (`registration_theme` / Design tab). Typography and spacing never per-activity via `form_schema`. No custom CSS / custom fonts (NFR-12). Admin chrome stays on platform lagoon/ink tokens — do not apply registration accent to admin.

UX-DR28: Accessibility floor — visible `<Label>` + `aria-describedby` for errors; focus order follows visual order; dialog focus trap with Esc close; public confirmation uses `role="status"` live region; Reduce Motion honored; 44×44px minimum target on public CTAs. Slash palette is a dialog: arrows + Enter; Esc closes.

UX-DR29: Voice and tone — public confirmation stays “You're registered for {activity}” / “See you there,” now with piping (e.g. “See you Saturday, Maya”). Unavailable may show Operator Closed message but still a reason chip (Full / Closed / Paused) — not CRM jargon.

UX-DR30: Phone input with country code; public tap targets ≥ 48px height. Sticky footer on tall forms so ThemeToggle remains reachable. `choice` / `yes_no` use large tap targets, not a new wizard.

UX-DR31: Responsive breakpoints — public default full-width below 768px, centered max 480px at 768px+. Admin Form tab remains desktop-primary with the existing mobile preview pattern from Studio (375px / 1280px).

**Inherited — Form tab authoring (must not regress)**

UX-DR24: `FormFieldEditor` remains a structured list (grip or arrows). Template picker keeps TGH Tennis, Ikigai Pickleball, Board Game Night. Capture adds slash-add palette + saved tenant templates; does not replace the list with a canvas.

UX-DR32: Banned — drag-and-drop form builder UI / canvas. Slash-add + saved templates are the Tally steal, not a designer. No column layout. No “typed prose becomes a Field.”

**Inherited — CRM + limits (Hidden Answers + caps)**

UX-DR-LG-LimitMeter: Dashboard / admin `LimitMeter` for communities / published / regs — warn ≥80%, block at 100% with a clear dial. At regs cap, public register rejects with a registrant-safe message. Capture does not change cap math or duplicate limit copy in the Form tab.

UX-DR-LG-History: `ClientRegistrationHistory` master/detail shows selected answers (expand/collapse; search at 5+). Hidden Field Answers appear here and on admin Registration detail. Email/consent remain full-width in the answer grid.

UX-DR-LG-AtCap: Activities list compound banner + recovery chips at published/regs cap. Capture Close-at / Closed message do not replace capacity-full as the winning unavailable reason.

**Inherited — Studio (theme split)**

UX-DR-RES-ThemeSplit: Design tab / Community Brand Kit own look. Form tab owns Fields + meta (intro, Closed message, Close-at, piping). Preview of new Field types uses existing public preview (`PublicRegistrationOpen variant="preview"` or equivalent). Accent contrast warning stays on Design, not Form.

UX-DR-RES-Tokens: Midnight Atelier + shadcn. Platform tokens win for typography and spacing. Presets rearrange layout and elevation only. Public registration is mobile-first (QR scan context).

**Capture-specific (new work; IDs namespaced so they do not collide with UX-DR1–32)**

UX-DR-RC-1: Slash / plus Field palette on the Form tab. Grouped as the toolbox (Always group on all plans; Core+ Scale and Emergency). Keyboard: arrows + Enter; Esc closes. Type `<select>` remains as fallback. Empty Form tab still has a visible **+** affordance.

UX-DR-RC-2: Hidden Fields: no Participant input or attribution chrome. Admin preview chip “Hidden · filled from link.” Operator can set defaultValue. Query-key name equals Field id.

UX-DR-RC-3: Unavailable screen prefers Operator Closed message when set; always shows a reason chip matching precedence (Full / Closed / Paused / Ended). Markdown-lite, not image-only. Empty Closed message → existing platform copy.

UX-DR-RC-4: Close-at control on the Form tab (or Activity schedule-adjacent meta) displays in the Activity timezone; persists UTC. Clearable. Past Close-at allowed at save. Public copy does not expose timezone jargon to the Participant.

UX-DR-RC-5: Thank-you / success copy editor supports piping tokens with a short token cheatsheet. Live preview substitutes a sample name. Hidden tokens are not offered for Participant-visible copy.

UX-DR-RC-6: Saved Form templates live in the existing template picker (not a new IA). Save current draft, name it, apply to unpublished Activity with the same confirm-replace as launch templates. Slot meter: Basic 1 / Core 5 / Pro 25. Over cap → `UpgradePanel` / plan-locked copy (“Core saves up to 5 form recipes…”). Core community-default and Pro Design-pin are extra actions on the template, not a canvas.

UX-DR-RC-7: Settings → Notifications: “Email me on new registrations” toggle (default on). No per-Activity mute in MVP.

UX-DR-RC-8 (Phase 2): Recipe picker is presets + simple equals/notEquals — not a logic graph. Optional steps toggle is a single control; Fields stay in the list editor with a step bucket chip. Off = no stepper chrome on public.

UX-DR-RC-9 (Phase 3): Share kit Embed snippet (iframe first). Allowed-embed-hosts admin list required before embed works. Contact section on the website builder is a fixed four-field block (heading/intro/button/success editable) — not a Form tab.

UX-DR-RC-10: Light and dark visual QA on every new public state (success with piping, unavailable with Closed message, new Field types) and the slash palette dialog. Theme change mid-form preserves values and scroll.

### FR Coverage Map

FR-RC-1: Epic 30 — Hidden Field type
FR-RC-2: Epic 30 — Query passthrough into Answers
FR-RC-3: Epic 30 — textarea Field
FR-RC-4: Epic 30 — date Field
FR-RC-5: Epic 30 — Piping on thank-you and confirmation email
FR-RC-6: Epic 30 — Closed message
FR-RC-7: Epic 30 — Close-at
FR-RC-8: Epic 30 — Slash / plus Field palette
FR-RC-9: Epic 30 — Operator new-Registration email
FR-RC-10: Epic 31 — visibleWhen Recipes
FR-RC-11: Epic 31 — Optional Identity → Details → Consent steps
FR-RC-12: Epic 32 — Activity embed route and snippet
FR-RC-13: Epic 32 — Website Contact section → Client
FR-RC-14: Epic 30 — Capture invariants (31/32 inherit; do not reopen caps or theme-in-schema)
FR-RC-15: Epic 30 — Save and apply tenant Form templates (last stories, after slash-add)
FR-RC-16: Epic 30 — Template slots by plan (Basic 1 / Core 5 / Pro 25)
FR-RC-17: Epic 30 — Core community default + Pro Design pin
FR-RC-18: Epic 30 — Wave 1 toolbox types

Companion extras (no FR-RC id): `country` (all plans), Core+ `scale` / `emergency`, Pro template duplicate → Epic 30. Phase 2 plan gate (Recipes Core+, steps Pro) → Epic 31.

## Epic List

### Epic 30: Author Saturday’s signup in Cohestra
Francis can build Saturday’s Form here (slash toolbox + Wave 1 types + Hidden/UTM), close the session with his copy, pipe the thank-you, get an email when someone registers, and **save the Form for next month** (last stories in this epic). Maya’s submit still writes a deduped Client. Tally is no longer required for the event job.
**FRs covered:** FR-RC-1, FR-RC-2, FR-RC-3, FR-RC-4, FR-RC-5, FR-RC-6, FR-RC-7, FR-RC-8, FR-RC-9, FR-RC-14, FR-RC-15, FR-RC-16, FR-RC-17, FR-RC-18
**Depends on:** Shipped Form tab, public `/register/{slug}`, Publish Gate, Outbox, Studio theme resolver. **Does not need** Epic 31 or 32.
**Story order constraint:** Validators + Hidden/Wave 1 persist before saved templates. Fat epic, thin stories (Close-at timezone, Hidden-not-in-Participant-email, `plan_locked` slots, Publish Gate each get their own story).

### Epic 31: Show only the fields that apply
Francis can hide guest name until “bringing a guest?” is yes (Recipes), and on Pro optionally split Identity → Details → Consent. Submit still creates the same Client as a single page. Public default stays one-thumb until the toggle is on. If a story needs nested AND/OR, **stop**.
**FRs covered:** FR-RC-10, FR-RC-11
**Plan gate:** Recipes Core+; optional steps Pro only. Basic has neither.
**Depends on:** Epic 30 Field types (`yes_no`, etc.). **Does not need** Epic 32.

### Epic 32: Put the Form where the audience already is
Francis embeds Saturday’s Form on a club/Notion page (allow-listed hosts, no `frame-ancestors *`), or adds a homepage Contact that creates a Client without a fake Activity.
**FRs covered:** FR-RC-12, FR-RC-13
**Depends on:** Epic 30 Hidden/query passthrough for embed UTMs. Contact does not need Recipes. **Do not start before Epic 30.**

<!-- Story sections filled in step 3. Do not invent stories in this revision. -->

## Epic 30: Author Saturday’s signup in Cohestra

Francis can author, close, attribute, thank, get notified, and reuse Saturday’s Form in Cohestra. Every public submit still upserts a deduped Client. Saved templates are the last stories in this epic.

### Story 30.1: Hidden Field and campaign query passthrough

As an Operator,
I want a Hidden Field whose value comes from the public link query string,
So that an Instagram `?ref=wa` write lands on the Registration and Client history without Maya seeing attribution chrome.

**Acceptance Criteria:**

**Given** I am on an unpublished Activity Form tab
**When** I add a Field with `type: "hidden"` and id `ref` (existing type control is enough)
**Then** `PUT .../form-schema` accepts it (`form_schema` `version` stays `1`)
**And** unknown types still `400`
**And** a required Hidden Field does **not** satisfy the Publish Gate
**And** `ClientProfileExtractor` does not map Hidden values to Client name, phone, or email

**Given** the public Form for that Activity
**When** a Participant opens `/register/{slug}`
**Then** no Hidden input and no attribution chrome are rendered
**And** admin preview may show a “Hidden · filled from link” chip (UX-DR-RC-2)

**Given** Hidden Field id `ref` and URL `?ref=wa`
**When** the Participant submits a valid Form
**Then** `registrations.answers.ref` is `"wa"`
**And** admin Registration detail and `ClientRegistrationHistory` show `ref = wa`
**And** HTML is stripped; value max length 200
**And** unknown query keys are ignored

**Given** Hidden Field id `ref` and no `?ref=`
**When** they submit
**Then** the Answer is empty or the operator `defaultValue`
**And** submit still succeeds

**Given** an existing Activity that only uses today’s v1 types
**When** I save its Form without Hidden Fields
**Then** it remains valid (NFR-RC-1)

## Epic 31: Show only the fields that apply

Francis can show Fields only when a Recipe says so, and on Pro optionally step Identity → Details → Consent, without turning the Form into a logic IDE.

## Epic 32: Put the Form where the audience already is

Francis can embed one Activity’s Form on an allow-listed host, or take a homepage Contact that writes a Client with no Activity.
