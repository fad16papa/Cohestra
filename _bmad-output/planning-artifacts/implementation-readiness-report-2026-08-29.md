---
stepsCompleted:
  - step-01-document-discovery
  - step-02-prd-analysis
  - step-03-epic-coverage-validation
  - step-04-ux-alignment
  - step-05-epic-quality-review
  - step-06-final-assessment
project_name: Registration Capture
date: '2026-08-29'
includedDocuments:
  - prds/prd-registration-capture-2026-08-29/prd.md
  - prds/prd-registration-capture-2026-08-29/addendum.md
  - prds/prd-registration-capture-2026-08-29/form-authoring-tiers.md
  - prds/prd-registration-capture-2026-08-29/form-component-toolbox.md
  - architecture.md
  - architecture/architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md
  - epics-registration-capture.md
  - ux-designs/ux-registration-capture-2026-08-29/DESIGN.md
  - ux-designs/ux-registration-capture-2026-08-29/EXPERIENCE.md
  - ux-designs/ux-registration-experience-studio-2026-08-12/DESIGN.md
  - ux-designs/ux-registration-experience-studio-2026-08-12/EXPERIENCE.md
  - ux-designs/ux-cohestra-2026-07-18/DESIGN.md
  - ux-designs/ux-cohestra-2026-07-18/EXPERIENCE.md
  - ux-designs/ux-lead-generation-crm-2026-06-14/DESIGN.md
  - ux-designs/ux-lead-generation-crm-2026-06-14/EXPERIENCE.md
  - ../specs/spec-registration-capture/SPEC.md
assessor: Implementation Readiness (bmad-check-implementation-readiness)
---

# Implementation Readiness Assessment Report

**Date:** 2026-08-29  
**Project:** Registration Capture  
**Assessor:** BMAD Implementation Readiness

## Document inventory (step 1)

Assessment target: **Registration Capture** (not the whole Cohestra backlog). Admin confirmed this set on 2026-08-29 including the SPEC folder.

Included: Capture PRD folder, platform `architecture.md` + enterprise spine, `epics-registration-capture.md`, Capture UX + inherited Studio / platform / lead-gen spines, `specs/spec-registration-capture/`.

Excluded: other product PRDs; `epics.md` / enterprise epics / Paddle; website-builder architecture/UX until Epic 32.3.

**WARNING:** No Capture-specific architecture run (intentional brownfield).

## PRD Analysis

### Functional Requirements

FR-RC-1: An Operator can add a Hidden Field on the Form tab. The Participant never sees an input. `form_schema` accepts `type: "hidden"`; unknown types still reject. Public renderer does not show an input (admin preview may show “Hidden · filled from link”). Hidden Fields never satisfy the Publish Gate. `ClientProfileExtractor` does not map Hidden values into Client name, phone, or email.

FR-RC-2: On public GET/submit, each Hidden Field id is filled from the request query (and later from Embed parent query). Unknown query keys ignored. `?ref=wa` + id `ref` persists `answers.ref = "wa"`. Missing query → empty or `defaultValue`; submit succeeds. HTML stripped; max 200. Admin Registration detail and Client history show the Answer. No Participant attribution chrome.

FR-RC-3: Operator can add `textarea`. Multi-line input. Save/preview/publish/submit/admin Answers round-trip. Max 2000. XSS-safe in admin. Client extract uses `text` name heuristics; otherwise Answers only.

FR-RC-4: Operator can add `date`. Stored `YYYY-MM-DD`. Invalid date rejected. Not mapped to a Client column. No min/max, no disable Sundays, no ranges.

FR-RC-18: Additive types `number`, `url`, `time`, `choice`, `yes_no`, `multi_choice`, `info`. `number` rejects non-numeric, optional min/max. `url` requires http/https. `time` stores `HH:mm`. `choice` single-select large taps; `multi_choice` several; `yes_no` boolean. `info` NonInput, markdown-lite, max 2000. None satisfy Publish Gate.

FR-RC-5: Success copy and confirmation subject/body may include `{{full_name}}`, `{{email}}`, `{{phone}}`, `{{field:<id>}}`. Success shows name from name Field. Same tokens in email. Missing value → empty or “there” (one rule). Hidden never on Participant success or confirmation email.

FR-RC-6: Operator can set `form_schema.meta.closedMessage`. Unavailable prefers it and still shows reason chip (Full / Closed / Paused). Empty → platform copy. Max 2000; markdown-lite; no images; XSS-sanitized.

FR-RC-7: Operator can set `form_schema.meta.registrationClosesAt`. UTC store; picker in Activity timezone. Empty = no datetime close. After Close-at, GET unavailable and submit rejected. Precedence: capacity → paused → Close-at → ended. Chip matches winner; Closed message still shows. Clearable; past Close-at at save allowed.

FR-RC-8: `/` or **+** opens toolbox palette (Always group + Core+ Scale/Emergency). Arrows + Enter; Esc. Type dropdown fallback. Reorder grip/up-down. No canvas. NPS/matrix/ranking/payment not in palette.

FR-RC-9: Successful public submit enqueues Outbox `RegistrationOperatorNotify` to `AdminContactEmail`. Subject: Activity + name or phone. Body: name, phone, email, link to Registrations. Not on Form edits. Default on; Settings toggle.

FR-RC-10: Field may include `visibleWhen: { fieldId, equals | notEquals }`. Presets + custom. Invisible Fields not rendered/required. Server drops spoofs. Guest name required only when bringing-guest is yes. Circular Recipes rejected. Publish Gate unchanged. Stop on nested AND/OR.

FR-RC-11: Toggle “Split into steps” → Identity / Details / Consent. Next/Back; validate step; one submit. Off = single page. Toggle only, not Field count. Auto-bucket; move Fields in list. 10-Field + on → three steps → same Client. Preview shows buckets.

FR-RC-12: Share kit iframe (optional popup later) for `/embed/register/{slug}`. Same submit API. Parent query → Hidden. `postMessage` height. Admin not embeddable. `allowedEmbedOrigins` required; no `*`. CSP only on embed route. Rate limits stay. Deploy docs with nginx/CSP.

FR-RC-13: Website Contact: fixed name, email, phone, message, consent. Operator authors heading/intro/button/success. Upsert Client (`LeadStatus = New`) + website inquiry. No Registration. Dedup phone/email. Core/Pro. Consent unchecked → Client, no marketing opt-in. Outbox `WebsiteInquiryOperatorNotify`. `POST /api/v1/public/website-inquiries`.

FR-RC-15: Save draft `form_schema` (fields + meta) as named tenant template; apply to unpublished Activity after confirm. `TenantId` scoped. Published apply locked. Publish Gate after apply. Launch templates remain.

FR-RC-16: Slots Basic 1 / Core 5 / Pro 25. Over → `403 plan_locked`. Downgrade: readable; no new saves until under cap.

FR-RC-17: Core+ one Community default template. Pro pin Design preset (confirm on apply). Basic rejects both. Theme never in `form_schema`.

FR-RC-14: Publish Gate, Client dedup, immutable Answers, one Form per Activity, shipped `TenantPlanLimits` (250/500/5000 + seat/community/activity) stay. No Tally uncap. Existing v1 Activities valid. `registration_theme` off schema. Hero via `RegistrationThemeResolver`.

**Total FRs: 18** (FR-RC-1–18; 14 is invariants).

### Non-Functional Requirements

NFR-RC-1: Additive `form_schema` only. Unknown types reject. Existing Activities unchanged. Field id is CRM key. Version stays 1; document additive types as v1.1.

NFR-RC-2: `registration_theme` off `form_schema`. Touchpoints resolver unchanged.

NFR-RC-3: Public Form and slash palette meet WCAG 2.2 AA. Closed message not image-only. Public stays one-thumb unless Phase 2 toggle on. Hidden adds no Participant chrome.

NFR-RC-4: Answers, Hidden, Close-at, Operator notify, templates scoped by `TenantId`. Isolation tests extended.

NFR-RC-5: Public GET/submit single-payload; Hidden parse O(fields). Existing 2s-on-4G floor.

NFR-RC-6: Operator notify and confirmation on Outbox + SendGrid; notify on all plans.

NFR-RC-7: Embed CSP allow-list; clickjacking documented. Relax framing only on embed route.

NFR-RC-8: Successful submit creates Registration + Client synchronously. Answers immutable.

NFR-RC-9: Public unauthenticated + Redis rate limit. Admin JWT. ProblemDetails.

NFR-RC-10: Do not encourage emails in query strings. Draft-as-Client stays deferred.

**Total NFRs: 10** (NFR-RC-1–10 as inventoried; PRD §11 lists 1–7, inventory added 8–10 inherited).

### Additional Requirements

- Toolbox: `country` all plans; Core+ `scale` / `emergency`; Pro `file`/`signature` later; never NPS/payment.
- Tiers: Pro may duplicate a template. Phase 2 Recipes Core+; steps Pro only.
- Assumptions: notify To AdminContactEmail; steps toggle-only; embed iframe first; Contact Core/Pro.
- Non-goals: clone Tally, logic IDE, uncap, canvas, registrant checkout, Tally import, bot friction in MVP.

### PRD Completeness Assessment

PRD is `status: final`, numbered FR-RC-*, phased, non-goals explicit. Companions (tiers, toolbox, addendum) are load-bearing. Residual implementer choice: piping fallback empty vs “there.” Sufficient for stories.

## Epic Coverage Validation

### Coverage Matrix

| FR | PRD (short) | Epic / Story | Status |
|---|---|---|---|
| FR-RC-1 | Hidden Field type | 30.1 | ✓ Covered |
| FR-RC-2 | Query passthrough | 30.1; embed parent in 32.2 | ✓ Covered |
| FR-RC-3 | textarea | 30.2 | ✓ Covered |
| FR-RC-4 | date | 30.2 | ✓ Covered |
| FR-RC-5 | Piping | 30.6 | ✓ Covered |
| FR-RC-6 | Closed message | 30.7 | ✓ Covered |
| FR-RC-7 | Close-at | 30.8 | ✓ Covered |
| FR-RC-8 | Slash palette + Core+ types | 30.4, 30.5 | ✓ Covered |
| FR-RC-9 | Operator notify | 30.9 | ✓ Covered |
| FR-RC-10 | Recipes | 31.1 | ✓ Covered |
| FR-RC-11 | Optional steps | 31.2 | ✓ Covered |
| FR-RC-12 | Embed | 32.1, 32.2 | ✓ Covered |
| FR-RC-13 | Contact → Client | 32.3 | ✓ Covered |
| FR-RC-14 | Invariants | 30.10 | ✓ Covered |
| FR-RC-15 | Save/apply templates | 30.11 | ✓ Covered |
| FR-RC-16 | Template slots | 30.12 | ✓ Covered |
| FR-RC-17 | Community default + pin | 30.13 | ✓ Covered |
| FR-RC-18 | Wave 1 types | 30.3 | ✓ Covered |

Companion extras: `country` 30.3; `scale`/`emergency` 30.5; Pro duplicate 30.13.

### Missing Requirements

None for numbered FR-RC-*.

### Coverage Statistics

- Total PRD FRs: 18
- FRs covered in epics: 18
- Coverage percentage: 100%

## UX Alignment Assessment

### UX Document Status

**Found.** Capture spines 2026-08-29 (delta) + inherited Studio, platform 2026-07-18, lead-gen FormFieldEditor.

### Alignment Issues

- Journeys UJ-RC-1–5 in EXPERIENCE match PRD. Slash / no-canvas / theme split match FR-RC-8 and FR-RC-14.
- Architecture does not specify slash-palette or embed CSP components. Brownfield: implementers use existing Next.js + CSP file + validators. **Gap is documentation, not a missing UI contract.**
- Website-builder UX/architecture were excluded from this assessment. **FR-RC-13 / Story 32.3 will need those docs at implement time.** Not a blocker for Epic 30.

### Warnings

- No Capture architecture spine (known).
- UX reviewer gate and key-screen mocks were skipped; spines are the visual contract.
- Piping fallback word not locked in UX (same as PRD assumption).

## Epic Quality Review

### Epic structure

| Epic | User value | Independence |
|---|---|---|
| 30 Author Saturday’s signup | Yes — author, close, attribute, notify, save | Stands alone |
| 31 Show only the fields that apply | Yes — Recipes / steps | Needs 30 types; not 32 |
| 32 Put the Form where the audience is | Yes — embed / Contact | Needs 30 Hidden for embed UTMs; Contact independent of 31 |

Not technical-layer epics. 30/31 share Form files; split kept for Recipe stop-rule and embed CSP (Admin A′).

### Story quality

- Given/When/Then present on all 18 stories.
- Forward deps in 30.6 / 30.7 / 30.10 were removed in epic validation.
- 30.10 voice is “As the platform” (invariants) — acceptable regression story, not a setup epic.
- Entities when needed: templates 30.11; allow-list 32.1; website inquiry 32.3.
- Brownfield: no starter-template story (correct).
- 32.2 AC “no Registration if frame never renders” is slightly soft — CSP block is the real test.

### Best practices checklist

- [x] Epics deliver user value
- [x] Epic independence (N does not need N+1)
- [x] Stories sized for one agent
- [x] No remaining forward dependencies
- [x] Tables/entities when first needed
- [x] Clear ACs
- [x] FR traceability

### Quality findings by severity

#### Critical

None.

#### Major

- **32.3 Contact** assessed without website-builder architecture/UX in the included set. Add those docs before implementing 32.3.

#### Minor

- 30.10 is platform-voiced.
- Piping fallback still an `[ASSUMPTION]`.
- No Capture architecture ADR for embed CSP (mitigated by Story 32.1 ACs + existing `content-security-policy.ts`).
- UX mocks spine-only.

## Summary and Recommendations

### Overall Readiness Status

**READY** for Epic 30 (Slice A / MVP).  
**READY WITH CAVEATS** for 31–32 (Phase 2/3): do not start 32 before 30; pull website-builder docs before 32.3.

### Critical Issues Requiring Immediate Action

None that block Story 30.1.

### Recommended Next Steps

1. Run **Sprint Planning** (`bmad-sprint-planning`) against `epics-registration-capture.md`.
2. **Create Story 30.1** (`bmad-create-story`) — Hidden Field + query passthrough.
3. Before Epic 32.3, add website-builder architecture + UX to the working set. Lock piping fallback (empty vs “there”) in the first piping story (30.6), not before 30.1.

### Final Note

This assessment identified **0 critical**, **1 major** (Contact docs later), and **4 minor** items. FR coverage is 18/18. You may proceed to implementation of Epic 30 as-is.
