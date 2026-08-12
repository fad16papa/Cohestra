---
title: Registration Experience Studio
status: final
created: 2026-08-12
updated: 2026-08-12
sources:
  - _bmad-output/planning-artifacts/registration-experience-2026-08-12/brief.md
  - _bmad-output/planning-artifacts/registration-experience-2026-08-12/forged-idea.md
  - _bmad-output/planning-artifacts/registration-experience-2026-08-12/recon-current-state.md
---

# PRD — Registration Experience Studio

## Problem

Community operators run multiple programs (tennis, pickleball, board games). Today they can set **hero + accent per activity** and build **forms field-by-field**, but:

- Branding does not **inherit** from community — repetitive setup and inconsistent look across activities in the same program.
- "Design" is limited to one color and one image — registration pages still feel like generic platform forms.
- **Website builder** and **registration page** are separate surfaces — operators configure identity twice.
- **Preview** on the Form tab does not match the emotional moment of scanning a QR at an event.

Participants decide in seconds whether to trust the form. Generic UI reads as disorganized; community-grounded UI reads as legitimate.

## Goals

- FR-RES-1: Operators define a **Community Brand Kit** once (optional logo, accent, default hero) and activities inherit by default.
- FR-RES-2: Each activity can **override** hero/accent and choose a **registration layout preset** (Classic, Card, Immersive Hero, Compact).
- FR-RES-3: Admin **Design** tab with live mobile/desktop preview using the same components as the public registration page.
- FR-RES-4: Optional **intro copy block** and **section headers** in long forms (same release or fast follow).
- FR-RES-5: **Plan gates** — Basic gets presets + accent; Core+ gets community logo + inherit/override; Pro gets all presets.

## Non-goals (v1)

- Custom fonts, arbitrary CSS injection, drag-and-drop canvas page builder.
- Embed widget / iframe registration.
- Conditional form logic, multi-step wizard, paid ticket checkout UI.
- Full website-builder section import onto registration pages (defer P2).

## Users

**Primary:** Core/Pro operator managing 2+ communities with recurring activities.  
**Secondary:** Basic operator with one community who wants polish without a full website.

## Functional requirements

### Community Brand Kit

- **FR-RES-1.1:** Community entity stores optional `logoAssetId`, `accentColor`, `defaultHeroImageUrl` (all nullable; backward compatible).
- **FR-RES-1.2:** Admin can create/read/update community brand kit via existing communities API; name rename behavior unchanged.
- **FR-RES-1.3:** Logo upload uses existing campaign-assets pipeline; Basic plan cannot set logo (403 `plan_locked` server-side; UI shows upgrade hint).

### Activity registration theme

- **FR-RES-2.1:** Activity stores `registrationTheme` JSON: `{ preset, inheritCommunityBrand, heroOverride?, accentOverride? }` separate from `form_schema`.
- **FR-RES-2.2:** When inherit is true (default), resolved public theme merges community kit → activity overrides → tenant/platform fallbacks.
- **FR-RES-2.3:** Presets: **Classic** (current layout), **Card**, **Immersive Hero**, **Compact** — typography and spacing stay on platform tokens (NFR-12).

### Admin Design experience

- **FR-RES-3.1:** Activity detail gains a **Design** tab (or extends Branding) with preset picker, inherit toggle, override fields, and live preview.
- **FR-RES-3.2:** Preview renders `PublicRegistrationOpen` with `variant="preview"` — same React tree as production.
- **FR-RES-3.3:** Accent picker warns when contrast fails WCAG AA on primary button; server rejects worst-case hex values.

### Form content (fast follow acceptable)

- **FR-RES-4.1:** `form_schema.meta` supports optional `introMarkdown` above fields.
- **FR-RES-4.2:** Field type or meta supports **section header** dividers in long forms.

### Plan gates

| Plan | Entitlement |
|------|-------------|
| Basic | Layout presets + per-activity accent; community name label only (no logo upload) |
| Core | Community logo + brand kit + inherit/override on activities |
| Pro | All presets (including Immersive Hero when gated) |

## Non-functional requirements

- **NFR-RES-1:** Resolved theme cached with published activity payload; no extra public round-trip.
- **NFR-RES-2:** Brand kit validation reuses activity branding rules (hex accent, hero URL/asset path, logo asset GUID).
- **NFR-RES-3:** WCAG AA contrast floor on accent-as-primary (client warn + server reject).
- **NFR-RES-4:** Tenant isolation — community brand kit scoped by `TenantId`; SM-1 tests extended.

## Success metrics

- ↑ registration completion rate (same activity, before/after themed publish).
- ↓ time-to-publish for cloned activities in a community with kit configured.
- Qualitative: operators report pages "look like our club" without requesting Webflow.

## Open items (deferred)

1. Tenant Settings brand accent cascade when community kit unset — default: use activity accent only; tenant accent does not auto-flow to registration in v1.
2. Sync preset accent with website builder `SitePage` accent — manual parity for v1; no automatic sync.
3. Storage: theme in dedicated `registration_theme` JSON column on activities (not `form_schema.meta`) — **decided for v1**.

## Epic mapping

| Epic | Stories |
|------|---------|
| Epic 25 | 25.1 Community brand kit · 25.2 Activity registration theme · 25.3 Public preset renderer · 25.4 Admin Design tab + preview · 25.5 Intro copy + section headers |

## Dependencies

- Communities catalog (Epic 6) — extend, do not replace.
- Activity branding (Epic 3) — evolves into theme contract.
- Campaign assets upload — reuse for logos and heroes.
- Midnight Atelier UX spine — registration presets extend, not replace, platform tokens.
