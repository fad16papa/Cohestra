---
title: Registration Touchpoints
status: final
created: 2026-08-16
updated: 2026-08-16
sources:
  - _bmad-output/planning-artifacts/prds/prd-registration-experience-studio-2026-08-12/prd.md
  - _bmad-output/planning-artifacts/implementation-artifacts/code-review-registration-email-hero-2026-08-15.md
  - Party mode roundtable 2026-08-16 (PR #197, #198)
---

# PRD: Registration Touchpoints

## 0. Document Purpose

This PRD defines how **resolved registration theme** (Design tab → community brand kit → activity branding) must propagate to every **post-registration touchpoint** — starting with confirmation email, with a contract that prevents surface drift like the PR #198 bug (live page showed hero; email showed broken platform logo).

Builds on **Registration Experience Studio** (`prd-registration-experience-studio-2026-08-12`). Downstream: architecture (shared resolver), UX (email template parity), epics/stories for SMS/calendar follow-ons.

## 1. Vision

When someone registers for an event, the moments *after* submit — confirmation email, share previews, future SMS/calendar — must feel like the same event they just signed up for. Operators configure hero and brand once in Design; participants should never see a generic Cohestra header or a missing image at the climax of registration.

The platform already resolves theme for the **public registration page** and **share kit**. This PRD extends that contract to **outbound channels** that cannot rely on browser same-origin paths.

## 2. Target User

### 2.1 Jobs To Be Done

- **Operator (Core/Pro):** "When I set a hero in Design, every participant touchpoint matches — I don't get support tickets about broken emails."
- **Participant:** "The confirmation email looks like the form I just filled — I trust I registered for the right event."
- **Platform team:** "One resolver, multiple renderers — we don't fix the same hero bug on every new surface."

### 2.2 Non-Users (v1)

- Marketing site hero (website builder sections) — separate surface.
- Operator admin chrome (tenant shell) — not participant-facing.

### 2.3 Key User Journeys

- **UJ-1. Maya registers for FNM on mobile**
  - **Persona + context:** Maya, 28, scans QR at a game store Friday night.
  - **Entry state:** Public registration page; Immersive hero from Design tab inherit chain.
  - **Path:** Fills form → submits → sees success on page → checks email within a minute.
  - **Climax:** Email opens with the **same hero image** as the registration page, registration ID prominent.
  - **Resolution:** Saves email; shows ID at check-in.
  - **Edge case:** Hero asset temporarily missing on disk → email uses absolute tenant URL or text header; never broken SVG platform logo.

- **UJ-2. Operator verifies post-publish touchpoints**
  - **Persona + context:** FA, Pro operator, just published FNM with new Design hero.
  - **Entry state:** Activity detail → Share kit preview already correct.
  - **Path:** Sends test registration → receives confirmation email.
  - **Climax:** Email hero matches Share kit and live `/register/fnm`.
  - **Resolution:** Confident to promote link at event.

## 3. Glossary

- **Resolved registration theme** — Output of `RegistrationThemeResolver`: preset, inherit flag, accent, hero URL, logo asset id. Precedence: theme override → community default → activity branding (when inherit true).
- **Registration touchpoint** — Participant-facing surface after or around submit: confirmation email (v1), share/OG preview (existing), SMS/calendar (future).
- **Theme renderer** — Adapter that maps resolved theme to a channel: browser (relative paths), email (CID inline or absolute URL), etc.
- **Campaign asset** — Uploaded image stored at `/api/v1/public/campaign-assets/{id}`; may be embedded inline in email.

## 4. Features

### 4.1 Unified theme resolution contract

**Description:** All registration touchpoints MUST resolve hero (and future accent/logo) through the same resolver input: `activity.registrationTheme`, linked **community** (by `communityLabel` + `tenantId`), and `activity` branding fields. Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-1: Single resolver for hero source

The system resolves hero URL for any registration touchpoint using `RegistrationThemeResolver` with community loaded by tenant-scoped community label lookup. Realizes UJ-1.

**Consequences (testable):**
- Confirmation email hero matches public API `heroImageUrl` for the same published activity.
- Design-tab-only hero (activity branding hero null) still appears in confirmation email.
- Community default hero appears when theme inherits and activity hero is null.

#### FR-2: Channel-specific rendering

Browser surfaces use same-origin relative campaign-asset paths. Email uses CID inline attachment when asset exists on disk; otherwise absolute tenant-host URL via `ActivityHeroImageUrlResolver.ResolveForEmail`. Realizes UJ-1.

**Consequences (testable):**
- Email HTML contains `cid:registration-hero` when asset file is present.
- Email HTML does not reference `/brand/cohestra-logo.svg` as `<img>` (SVG blocked for email clients).
- Fallback header uses brand text when no hero and no raster logo.

#### FR-3: Shared community lookup

Community lookup by label is implemented once and reused by activity public mapping and registration notification paths. Tenant id is always part of the lookup key. Realizes UJ-2.

**Consequences (testable):**
- No duplicate `LoadCommunityAsync` / `LoadCommunityByLabelAsync` implementations with divergent filters.

**Notes:** `[ASSUMPTION:]` SMS and calendar invites defer to v2 but must call the same resolver when built.

### 4.2 Operational observability (hardening)

**Description:** When hero cannot be rendered, log at Warning with activity id and reason (asset missing, resolved hero null). Realizes UJ-1 edge case.

#### FR-4: Hero render fallback logging

When confirmation email sends without inline hero and without URL hero, log Warning including registration id and resolved hero state.

**Consequences (testable):**
- Log line present in outbox handler path when hero is null after resolution.

### 4.3 Admin mobile parity (related — PR #197)

Not core to touchpoints but same trust thread: activity status badge and clients empty state render correctly on mobile viewports. Cross-ref only.

## 5. Non-Goals (Explicit)

- Redesign of confirmation email template layout (copy, sections) — hero fix only.
- SMS, WhatsApp, or calendar invite implementation in this PRD slice.
- Custom fonts or arbitrary CSS in email.
- Participant-editable confirmation preferences.

## 6. MVP Scope

### 6.1 In Scope

- FR-1 through FR-4 for confirmation email.
- Shared community query helper.
- Unit tests proving theme override and community inheritance paths for email.
- Clients list page-overflow stale row fix (admin trust, separate bug found in review).

### 6.2 Out of Scope for MVP

- SMS/calendar touchpoints — defer v2; must reuse FR-1 contract.
- PNG platform logo for email header — text fallback sufficient for v1.
- End-to-end SendGrid integration test in CI — manual/UAT verify.

## 7. Success Metrics

**Primary**
- **SM-1:** 0 support reports of "confirmation email missing event hero" for activities with Design hero set — 30 days post-deploy. Validates FR-1, FR-2.

**Secondary**
- **SM-2:** Confirmation email hero matches share-kit preview URL for 100% of sampled test registrations in UAT. Validates FR-1.

**Counter-metrics**
- **SM-C1:** Do not optimize for email open rate at cost of inline image size — keep hero ≤ existing 2MB asset cap.

## 8. Open Questions

1. Should confirmation email include community logo when preset is Card and logo asset exists? (Defer — hero first.)
2. Do we need a "Send test confirmation email" button on activity detail? (UX fast follow.)

## 9. Assumptions Index

- Inline `[ASSUMPTION:]` SMS/calendar will reuse FR-1 when added.
- Tenant `PUBLIC_BASE_URL` is correctly configured in production for URL fallback path.
