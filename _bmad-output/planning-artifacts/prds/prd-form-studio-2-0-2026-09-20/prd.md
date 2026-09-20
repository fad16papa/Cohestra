---
title: Form Studio 2.0 — Visual Form Builder
status: final
created: 2026-09-20
updated: 2026-09-20
epic: 36
precedes_implementation: true
sources:
  - _bmad-output/planning-artifacts/prds/prd-form-experience-system-2026-09-18/prd.md
  - _bmad-output/planning-artifacts/prds/prd-cohestra-enterprise-2026-07-15/prd.md
  - _bmad-output/planning-artifacts/prds/prd-registration-capture-2026-08-29/prd.md
  - _bmad-output/implementation-artifacts/epic-35-retrospective.md
  - _bmad-output/implementation-artifacts/investigations/post-epic-35-fnm-visual-unchanged.md
---

# PRD — Form Studio 2.0 (Visual Form Builder)

**Epic:** 36 — Form Studio 2.0 — Visual Form Builder  
**Foundation:** Epic 35 (CLOSED) — Modern Form Experience System  
**Architecture:** `_bmad-output/planning-artifacts/architecture-form-studio-2-0-2026-09-20/ARCHITECTURE-SPINE.md`  
**UX:** `_bmad-output/planning-artifacts/ux-designs/ux-form-studio-2-0-2026-09-20/`

## 1. Purpose

Cohestra operators today **configure** registration forms (field list, templates, branding, experience dimensions) but cannot **visually compose** sophisticated responsive forms comparable to dedicated modern form builders (Tally, Typeform, Fillout as **quality benchmarks**, not clones).

Form Studio 2.0 closes the gap: operators add, arrange, and design blocks; preview the canonical public renderer; publish through Activities without JSON editing.

**Non-goals:** Figma/Webflow replacement, arbitrary HTML/CSS/JS, general website builder, AI-only form generation.

## 2. Problem

| Today | Target |
|-------|--------|
| Linear field editor (`FormFieldEditor`) | Block-based builder with palette |
| `introMarkdown` meta for prose | In-form content blocks (heading, paragraph, divider, image) |
| Implicit order = `fields[]` | Explicit **composition tree** + reorder (drag + keyboard) |
| Design = preset + accent + hero + Experience tab | Bounded **design tokens** (typography, surfaces, inputs, CTA, background) |
| Style dimension often inert on public UI | **Modern** vs **Minimal** visibly distinct |
| Activity context duplicated manually | **Domain-aware blocks** bind to Activity data |

## 3. North star

> A tenant operator can visually create a sophisticated responsive registration form from empty or existing state, configure appearance and behavior, preview the exact public result at desktop/tablet/mobile, and publish without engineering knowledge — while Cohestra preserves one schema, one validation model, one submission path, and Activity/CRM differentiation.

## 4. Success metrics

| ID | Metric |
|----|--------|
| SM-FS2-1 | ≥80% of pilot operators complete “add field + reorder + preview mobile” without support (UAT sample) |
| SM-FS2-2 | Zero regression on Epic 35 public shells (Modern Centered, Split, Poster, Conversational) in CI matrix |
| SM-FS2-3 | 100% of saved pre-2.0 forms open and publish without manual migration |
| SM-FS2-4 | Style control (Modern/Minimal) produces deterministic visual delta on Modern Centered in checkpoint review |

## 5. User journeys

**UJ-FS2-1 — Priya composes an event registration (Core)**  
Opens Activity → Form → Build. Adds Activity Details domain block, section “Your details”, two-column name row, choice block for referral. Switches Preview → tablet. Saves. Publishes. Public `/register/{slug}` matches Preview (minus chrome).

**UJ-FS2-2 — Marco fixes long form on mobile (Basic)**  
Reorders fields with keyboard move-up. Adds divider + paragraph before consent. Confirms 360px Preview has no horizontal scroll.

## 6. Functional requirements

### 6.1 Builder workspace

| ID | Requirement |
|----|-------------|
| FR-FS2-1 | Form Studio exposes **Build** and **Preview** modes (extend current Form tab); BMAD UX may add sub-areas (Content, Structure) without cluttering top-level nav |
| FR-FS2-2 | **Block palette** lists addable input, content, structure, and entitled domain blocks |
| FR-FS2-3 | Operators **reorder** composition via drag-and-drop **and** keyboard-accessible move up/down |
| FR-FS2-4 | Selected block shows **inspector** for block-specific settings (label, required, options, etc.) |
| FR-FS2-5 | Draft schema + design draft sync to Preview via existing preview key pattern; no second preview engine |

### 6.2 Schema & composition

| ID | Requirement |
|----|-------------|
| FR-FS2-6 | **Single canonical schema** evolves (see Architecture AD-1): `fields[]` retains all **input** definitions; optional `composition[]` defines render order and non-input blocks |
| FR-FS2-7 | Legacy forms with only `fields[]` render in field order (normalization on read) |
| FR-FS2-8 | **Content blocks** (heading, paragraph, divider, image) are presentation-only — never submitted |
| FR-FS2-9 | **Sections** group blocks with optional title/description; represented in composition, not fake field types only |
| FR-FS2-10 | **Columns** support 1- and 2-column rows (MVP); collapse to single column on mobile breakpoints |
| FR-FS2-11 | Field IDs remain stable for validation, visibility rules, and registration responses |

### 6.3 Domain-aware blocks (phased)

| ID | Requirement |
|----|-------------|
| FR-FS2-12 | **Activity metadata block** renders name, schedule, location, capacity from Activity/public payload — not operator-typed duplicates |
| FR-FS2-13 | Domain blocks degrade gracefully when data missing (Preview + public) |
| FR-FS2-14 | Community identity block uses tenant/community labels and logo when available |

### 6.4 Design system (bounded tokens)

| ID | Requirement |
|----|-------------|
| FR-FS2-15 | Design controls use **token enums** — no raw CSS |
| FR-FS2-16 | Typography: safe font stack + heading/body scale steps |
| FR-FS2-17 | Field appearance: size, radius, border/background presets |
| FR-FS2-18 | Button: CTA copy (existing), size, width, alignment, variant |
| FR-FS2-19 | Background: solid/surface presets; image only where entitlement + contrast rules pass |
| FR-FS2-20 | **Modern** vs **Minimal** style produces visible differences on public Modern Centered (and shared tokens where applicable) |

### 6.5 Experience integration (Epic 35 preserved)

| ID | Requirement |
|----|-------------|
| FR-FS2-21 | Layout (Centered / Split / Poster), Flow (single-page / conversational), Brand, Hero remain on Design/Experience surfaces |
| FR-FS2-22 | `PublicRegistrationOpen` remains single public renderer; composition affects form **body** region inside shells |
| FR-FS2-23 | Preview path: `RegistrationPublicPreviewShell` → `PublicRegistrationOpen` unchanged |

### 6.6 Preview & responsive

| ID | Requirement |
|----|-------------|
| FR-FS2-24 | Preview viewports: **Desktop, Tablet, Mobile** with realistic widths (see UX) |
| FR-FS2-25 | Public output verified at 1440 / 1024 / 768 / 430 / 390 / 360 for new composition features |

### 6.7 Entitlements

| ID | Requirement |
|----|-------------|
| FR-FS2-26 | **Basic:** core field builder, reorder, sections, content blocks (baseline set), Modern Centered, Modern/Minimal, essential branding, responsive Preview — **no tenant public website URL** (unchanged) |
| FR-FS2-27 | **Core:** Split, Poster, columns, richer branding tokens, domain blocks (per architecture), website link rules per enterprise PRD |
| FR-FS2-28 | **Pro:** Conversational flow, advanced logic (Phase 2), premium layout/style depth |
| FR-FS2-29 | Server-side enforcement mirrors Studio locks (pattern from Epic 35) |

### 6.8 Logic & multi-step (deferred phases)

| ID | Requirement |
|----|-------------|
| FR-FS2-30 | Declarative conditional logic — **Phase 2** (not MVP) unless architecture proves trivial extension of `visibleWhen` |
| FR-FS2-31 | First-class multi-step pages — evaluate Phase 1 vs 2; MVP may retain Epic 35 step buckets + conversational Pro flow |

### 6.9 Backward compatibility & safety

| ID | Requirement |
|----|-------------|
| FR-FS2-32 | Opening old forms never requires manual migration |
| FR-FS2-33 | Save round-trip preserves unknown schema keys (forward-compatible JSON) |
| FR-FS2-34 | Submission payload unchanged for input fields; content/structure blocks excluded |

## 7. Phased roadmap

| Phase | Scope |
|-------|--------|
| **Phase 1 — Visual composition (Epic 36 MVP)** | Composition schema, palette, reorder, sections, content blocks, 2-column rows, design tokens baseline, Modern/Minimal + Modern Centered quality, Preview desktop/tablet/mobile, BC, entitlements |
| **Phase 2 — Advanced behavior** | Declarative logic builder, multi-step pages, branching |
| **Phase 3 — Scale / reuse** | Templates library, duplication, reusable blocks, shared design systems |
| **Phase 4 — Intelligent Studio** | Cohestra AI suggested fields, activity-aware suggestions, conversion insights |

## 8. Explicit non-goals (Epic 36)

- Reopening Epic 35
- Cloning Tally/Typeform/Fillout UI or branding
- Arbitrary HTML embeds in operator config
- Full logic engine in Story 36.1

## 9. Traceability

| Epic 35 FR | Carried forward |
|------------|-----------------|
| Single renderer, Preview parity | FR-FS2-21–23 |
| Plan gates | FR-FS2-26–29 |
| Responsive / a11y | FR-FS2-24–25 + NFRs in addendum |

**Post-Epic visual-quality follow-up:** absorbed into **Story 36.5** (Modern Centered + style), not a separate epic.

## 10. Open questions (non-blocking for planning)

- Tablet preview width exact tokens — UX finalizes
- Image content block storage (asset picker vs URL) — Core+ only `[ASSUMPTION]`
- Maximum composition depth — architecture caps nesting at 3 levels MVP
