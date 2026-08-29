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

### Story 30.2: Long text and date Fields

As an Operator,
I want `textarea` and `date` Fields on Saturday’s Form,
So that notes and a preferred session day live in Cohestra instead of Tally.

**Acceptance Criteria:**

**Given** an unpublished Activity Form tab (type dropdown is enough; slash-add is 30.4)
**When** I add `type: "textarea"` and save
**Then** `form_schema` `version` stays `1` and the Field round-trips on admin GET
**And** public preview and `/register/{slug}` show a multi-line input
**And** submit persists the Answer keyed by Field id
**And** max length 2000 is enforced on save and submit
**And** admin Registration detail / Client history render the value XSS-safe
**And** `ClientProfileExtractor` applies the same name heuristics as `text`; otherwise Answers only
**And** `textarea` does not satisfy the Publish Gate

**Given** I add `type: "date"`
**When** I save, preview, publish (required phone or email still present), and submit
**Then** a valid value is stored as `YYYY-MM-DD`
**And** an invalid date is rejected on submit (`400` ProblemDetails)
**And** the value is **not** mapped to a Client column
**And** there is no min/max, no “disable Sundays,” and no date range
**And** `date` does not satisfy the Publish Gate

**Given** Story 30.1 Hidden Fields already on the Form
**When** I add textarea and date beside them
**Then** Hidden query passthrough still works
**And** existing v1 types remain valid (NFR-RC-1)

### Story 30.3: Wave 1 toolbox types and country

As an Operator,
I want number, link, time, yes/no, choice, multi-choice, info, and country Fields,
So that Saturday’s event questions fit the toolbox without opening Tally.

**Acceptance Criteria:**

**Given** an unpublished Form
**When** I save Fields of types `number`, `url`, `time`, `choice`, `yes_no`, `multi_choice`, `info`, and `country`
**Then** each type is accepted on `form_schema` version `1`
**And** unknown types still reject
**And** none of these types satisfy the Publish Gate
**And** `info` is NonInput (no Answer); markdown-lite; max 2000; XSS-sanitized on public render

**Given** a Participant on `/register/{slug}`
**When** they fill Wave 1 Fields and submit
**Then** `number` rejects non-numeric; optional min/max enforced when set
**And** `url` requires `http` or `https`
**And** `time` stores `HH:mm` with no timezone math
**And** `choice` is single-select with tap targets ≥ 44×44px (UX-DR30); `yes_no` stores boolean; `multi_choice` allows several (optional min/max)
**And** `country` is an ISO list reusing phone-country data
**And** Answers appear on admin Registration detail and Client history
**And** extract to Client columns stays limited to name heuristics / phone / email / consent — these types are Answers-only (NFR-RC-1)

**Given** light and dark resolved themes
**When** I preview the new controls
**Then** labels, errors, and focus rings meet WCAG 2.2 AA (UX-DR-RC-10, NFR-RC-3)

### Story 30.4: Slash-add Field palette

As an Operator,
I want `/` or **+** to open a toolbox palette,
So that I can add Email and Hidden without treating the type `<select>` as the primary path.

**Acceptance Criteria:**

**Given** I am on the Form tab list editor (UX-DR24)
**When** I type `/` or activate **+**
**Then** a palette dialog opens grouped as the Always toolbox: Text, Long text, Number, Email, Phone, Link, Date, Time, Yes/No, Choice, Dropdown, Multi-choice, Checkbox, Consent, Referral, Country, Section, Info, Hidden
**And** keyboard arrows + Enter select; Esc closes (UX-DR28)
**And** adding a type inserts a Field in the list; reorder stays grip / up-down
**And** the existing type dropdown remains as fallback
**And** there is no drag-and-drop canvas, no column layout, no “typed prose becomes a Field” (UX-DR32, UX-DR-RC-1)
**And** NPS, CSAT, ranking, matrix, and payment are not in the palette

**Given** an empty Form
**When** the tab loads
**Then** **+** is visible without requiring a Field to exist first

**Given** I add Email + Hidden via the palette (types from 30.1–30.3)
**When** I save, preview, and publish (Publish Gate still requires required phone or email)
**Then** public submit and admin Answers work as in those stories

### Story 30.5: Core+ scale and emergency contact

As a Core or Pro Operator,
I want a labeled 1–5 scale and a compound emergency-contact Field,
So that skill level and a door-contact live on the same Form without a survey block.

**Acceptance Criteria:**

**Given** a Core or Pro tenant
**When** I add `scale` or `emergency` from the palette (or type control)
**Then** `scale` is a labeled linear 1–5 (e.g. Beginner → Advanced), **not** NPS
**And** `emergency` stores one Field id with compound Answer `{ name, phone }`
**And** both persist, preview, publish, submit, and show in admin Answers / Client history
**And** neither satisfies the Publish Gate
**And** neither maps to Client name/phone/email extract

**Given** a Basic tenant
**When** I add `scale` or `emergency` via API or UI
**Then** the API returns `403 plan_locked` with upgrade hint
**And** the palette shows those items disabled / upgrade, not missing-without-explanation

**Given** Stories 30.1–30.4
**When** I mix scale/emergency with Hidden and Wave 1
**Then** existing types and query passthrough still work

### Story 30.6: Piping on thank-you and confirmation email

As an Operator,
I want thank-you copy and the confirmation email to substitute `{{full_name}}`, `{{email}}`, `{{phone}}`, and `{{field:<id>}}`,
So that Maya sees “See you Saturday, Maya” without a hardcoded name — and Hidden values never leak to her.

**Acceptance Criteria:**

**Given** operator-authored success copy with `{{full_name}}`
**When** Maya submits with a name Field value “Maya”
**Then** the success screen shows her name and uses `role="status"` (UX-DR28, UX-DR29)
**And** missing values use one tested rule: empty string **or** fallback “there” (pick one in implementation; do not fork)

**Given** confirmation subject/body with the same token set
**When** Outbox sends the existing registration confirmation
**Then** tokens are substituted
**And** the email layout and hero still come from `RegistrationThemeResolver` (do not fork Touchpoints)
**And** Hidden Field values are **never** substituted into the success screen or confirmation email
**And** admin Registration detail and Operator notify (30.9) may still show Hidden Answers

**Given** the success-copy editor
**When** I open the token cheatsheet (UX-DR-RC-5)
**Then** Hidden Field ids are not offered for Participant-visible copy
**And** live preview substitutes a sample name

### Story 30.7: Closed message

As an Operator,
I want my own Closed message when the Form is unavailable,
So that Maya sees “Waitlist opens Monday on WhatsApp” instead of only platform “Full.”

**Acceptance Criteria:**

**Given** I set `form_schema.meta.closedMessage` (max 2000, markdown-lite, no images)
**When** the public Form is unavailable (capacity full, paused, ended, or Close-at from 30.8)
**Then** the Operator copy is shown XSS-sanitized
**And** a reason chip still shows (Full / Closed / Paused / Ended) (UX-DR-RC-3, UX-DR20)
**And** empty Closed message → existing platform copy

**Given** light and dark themes
**When** the unavailable screen renders
**Then** contrast meets WCAG 2.2 AA; the message is not image-only (NFR-RC-3)

### Story 30.8: Close-at

As an Operator,
I want an optional Close-at datetime independent of Activity end,
So that the public Form rejects new Registrations after that instant even if capacity remains.

**Acceptance Criteria:**

**Given** I set `form_schema.meta.registrationClosesAt`
**When** I save
**Then** the value is stored as a UTC instant
**And** the picker displays in the **Activity timezone** (UX-DR-RC-4)
**And** I can clear Close-at
**And** a past Close-at at save is allowed

**Given** empty Close-at
**When** the public Form is evaluated
**Then** datetime close does not apply (capacity / paused / ended still do)

**Given** server clock is after Close-at
**When** a Participant GETs or POSTs `/register/{slug}`
**Then** GET is unavailable and submit is rejected
**And** unavailable **precedence** is: capacity full → paused → Close-at → Activity ended → platform default
**And** the reason chip matches the winning reason; Closed message from 30.7 still shows when set
**And** Participant copy does not expose timezone jargon

### Story 30.9: Operator email on new Registration

As an Operator,
I want an email when someone registers,
So that I get the lead without waiting on a webhook or opening Tally.

**Acceptance Criteria:**

**Given** a successful public submit
**When** the Registration is committed
**Then** Outbox enqueues `RegistrationOperatorNotify` to tenant `AdminContactEmail`
**And** subject includes Activity title and Participant name or phone
**And** body includes name, phone, email, and a link to Activity → Registrations
**And** Hidden Answers may appear in this Operator mail (not in Participant confirmation — 30.6)
**And** the message does **not** enqueue on Form field edits or draft saves
**And** registration notification remains available on all plans (NFR-RC-6)

**Given** Settings → Notifications
**When** I view “Email me on new registrations”
**Then** the toggle defaults **on** (UX-DR-RC-7)
**And** when off, public submit still creates Registration + Client but does not enqueue Operator notify
**And** there is no per-Activity mute and no Slack in this story

### Story 30.10: Capture invariants stay shipped

As the platform,
I want Publish Gate, Client dedup, immutable Answers, one Form per Activity, and shipped plan caps unchanged,
So that Capture cannot uncap Tally-style or fork theme into `form_schema`.

**Acceptance Criteria:**

**Given** an Activity Form
**When** I try to publish without a required Phone **or** Email Field
**Then** publish is rejected (`PublishGateValidator` / `FormSchemaValidator`)
**And** Hidden, textarea, date, Wave 1, scale, emergency, and info never satisfy that gate

**Given** `TenantPlanLimits` Basic 250 / Core 500 / Pro 5,000 registrations per month (plus existing seat / community / activity caps)
**When** this epic ships
**Then** those numbers are unchanged
**And** at regs cap, public register rejects with a registrant-safe message; LimitMeter still owns cap copy (UX-DR-LG-LimitMeter)

**Given** a published Activity
**When** a Participant submits
**Then** Answers are immutable; historical JSONB is not rewritten (NFR-RC-8)
**And** Client dedup by phone/email still upserts one Client

**Given** Studio / Touchpoints
**When** I save Form meta or a template (30.11+)
**Then** `registration_theme` is never written into `form_schema` (NFR-RC-2)
**And** confirmation hero still uses `RegistrationThemeResolver`

**Given** existing Activities that only use pre-Capture v1 types
**When** I load and publish them
**Then** they remain valid without a data migration

### Story 30.11: Save and apply tenant Form templates

As an Operator,
I want to save this draft Form as a named tenant template and apply it to the next unpublished Activity,
So that next month’s Saturday is two taps, not a blank Form tab.

**Acceptance Criteria:**

**Given** an unpublished Activity whose Form I authored (types from 30.1–30.5; meta from 30.6–30.8)
**When** I save it as a named tenant Form template
**Then** name + `form_schema` snapshot (fields + meta) is stored scoped by `TenantId`
**And** `registration_theme` is not in the snapshot
**And** platform launch templates (Tennis, Pickleball, Board Game) remain available

**Given** another unpublished Activity
**When** I apply that template after confirm
**Then** draft Fields are replaced the same way launch templates work today
**And** Publish Gate still runs on the Activity after apply

**Given** a published Activity
**When** I try to apply a template
**Then** apply stays locked (same as launch templates)

**Given** the existing template picker (UX-DR-RC-6)
**When** I save, rename, replace, or delete my template
**Then** no new IA is introduced
**And** another tenant cannot read this row (NFR-RC-4)

### Story 30.12: Template slots by plan

As the platform,
I want saved-template slots Basic 1 / Core 5 / Pro 25,
So that authoring freedom is the SKU and registration caps do not move.

**Acceptance Criteria:**

**Given** a Basic tenant with one saved template
**When** I try to create a second
**Then** API returns `403 plan_locked` with upgrade copy (“Core saves up to 5 form recipes…”)
**And** the picker shows a slot meter (UX-DR-RC-6)

**Given** a Core tenant with five templates
**When** I save a sixth
**Then** `403 plan_locked`

**Given** a Pro tenant with 25 templates
**When** I save a 26th
**Then** `403 plan_locked`

**Given** a downgrade that puts the tenant over the new slot cap
**When** I list templates
**Then** existing templates remain readable
**And** I cannot save new ones until under the new cap (same pattern as activity limits)

### Story 30.13: Community default, Design pin, and Pro duplicate

As a Core or Pro Operator,
I want a Community default template, and as Pro I want to pin a Design preset and duplicate a template,
So that new Activities start from our Saturday recipe and optionally pick up the page look — without writing theme into `form_schema`.

**Acceptance Criteria:**

**Given** a Core or Pro tenant
**When** I set one saved template as the default for a Community
**Then** new Activities in that Community pre-fill that `form_schema`
**And** theme is still not in `form_schema`

**Given** a Pro tenant
**When** I pin a Design preset id on a template and apply it
**Then** apply offers to set that preset on the Activity; I must confirm
**And** I can duplicate a saved template (counts toward the 25-slot cap)

**Given** a Basic tenant
**When** I call community-default, preset-pin, or duplicate endpoints
**Then** API returns `403 plan_locked`

**Given** a Core tenant
**When** I call preset-pin
**Then** `403 plan_locked`
**And** community default still works

## Epic 31: Show only the fields that apply

Francis can show Fields only when a Recipe says so, and on Pro optionally step Identity → Details → Consent, without turning the Form into a logic IDE.

**FRs covered:** FR-RC-10, FR-RC-11  
**Depends on:** Epic 30 Field types (`yes_no`, etc.). Public default stays one page. If a story needs nested AND/OR, calculate, jump-to-page, regex, or “contains,” **stop**.

### Story 31.1: visibleWhen Recipes

As a Core or Pro Operator,
I want named Recipes (and a simple equals / notEquals custom rule) so a Field shows only when another Field matches,
So that guest name is required only when Maya is bringing a guest — without a logic IDE.

**Acceptance Criteria:**

**Given** a Core or Pro tenant and a Form that includes a `yes_no` (or equivalent) “Bringing a guest?” Field plus a guest-name Field
**When** I apply the guest-name Recipe (or custom `visibleWhen: { fieldId, equals: "yes" }`)
**Then** `form_schema` stores `visibleWhen` additively on version `1`
**And** circular Recipes are rejected at Form save (`400` ProblemDetails)
**And** Publish Gate is unchanged (still required phone or email)
**And** Operator UX is presets (guest name, dietary, member ID, visitor company) plus custom pick Field + value — not a graph (UX-DR-RC-8)

**Given** the public Form
**When** “Bringing a guest?” is No
**Then** guest name is not rendered and not required
**And** submit with empty guest succeeds
**When** it is Yes
**Then** guest name is shown and required
**And** submit with empty guest fails

**Given** a client spoofs an Answer for a Field that is currently invisible
**When** they POST
**Then** the server re-validates visibility and **drops** spoofed Answers
**And** the Registration + Client still succeed when the visible required Fields are valid

**Given** a Basic tenant
**When** I save `visibleWhen` via API or UI
**Then** `403 plan_locked`

**Given** any story draft that needs nested AND/OR, calculate, jump-to-page, regex, or “contains”
**When** that requirement appears
**Then** this epic stops; do not implement it here

### Story 31.2: Optional Identity → Details → Consent steps

As a Pro Operator,
I want a single “Split into steps” toggle,
So that a long Form can be Identity / Details / Consent without making QR-at-the-door a Typeform interview.

**Acceptance Criteria:**

**Given** a Pro tenant
**When** I turn “Split into steps” **on**
**Then** Fields auto-bucket: name / phone / email → Identity; consent → Consent; else Details
**And** I can move a Field between steps **inside the list editor** (not a canvas) (UX-DR24, UX-DR32)
**And** step labels default Identity / Details / Consent
**And** preview shows steps and each Field’s bucket (UX-DR-RC-8)
**And** the toggle is the only enablement — Field count does **not** auto-enable steps

**Given** a 10-Field Form with the toggle on
**When** a Participant uses Next / Back
**Then** the current step validates before Next
**And** there is one submit on the last step
**And** the Registration + Client are identical to the same Form submitted as a single page

**Given** the toggle is **off** (default)
**When** a Participant opens `/register/{slug}`
**Then** there is no stepper chrome
**And** the public Form stays one page / one-thumb (NFR-RC-3, UX-DR9)

**Given** a Basic or Core tenant
**When** I enable steps via API or UI
**Then** `403 plan_locked`
**And** Core may still use Recipes from 31.1

**Given** Recipes from 31.1 on a stepped Form
**When** a Field is invisible on the current step
**Then** it is not required; server still drops spoofed Answers as in 31.1

## Epic 32: Put the Form where the audience already is

Francis can embed one Activity’s Form on an allow-listed host, or take a homepage Contact that writes a Client with no Activity.
