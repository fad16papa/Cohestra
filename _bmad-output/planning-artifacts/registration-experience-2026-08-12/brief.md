---
title: Registration Experience Studio
status: draft
created: 2026-08-12
updated: 2026-08-12
purpose: Product brief for community-aware registration page design
---

# Registration Experience Studio

## One-liner

Let community operators make every registration page feel like *their* program — community brand once, per-activity tweaks, no designer required.

## Problem

Operators run multiple communities (tennis, pickleball, board games). Today they can set **hero + accent per activity** and build **forms field-by-field**, but:

- Branding doesn't **inherit** from community — repetitive setup, inconsistent look across activities.
- "Design" is limited to one color and one image — pages still feel like generic platform forms.
- **Website builder** and **registration page** look like different products — operators configure twice.
- **Preview** doesn't match the emotional moment of scanning a QR at an event.

Participants decide in seconds whether to trust the form. Generic UI reads as "disorganized club" (market research); community-grounded UI reads as legitimate.

## Target user

**Primary:** Pro/Core operator managing 2+ communities with recurring activities (Francis-style persona).  
**Secondary:** Basic operator with one community who wants polish without a website.

## Solution (v1)

### Community Brand Kit
Per community (catalog entity): optional logo, accent color, default hero image, optional default form template.

### Activity registration theme
Each activity inherits community kit; operator can override hero/accent and choose a **layout preset**:
- **Classic** — current layout (hero stack + form)
- **Card** — form on elevated card over soft tint
- **Immersive** — tall hero, form scrolls over gradient fade
- **Compact** — minimal hero, form-first (waitlist / last-minute events)

### Design tab + live preview
Mobile/desktop preview using the same components as public registration. Contrast warning if accent fails WCAG AA on buttons.

### Form content improvements (same release or fast follow)
- Intro markdown block above fields ("What to expect")
- Section dividers in long forms

## What we're NOT building (v1)

Custom fonts, arbitrary CSS, drag-and-drop canvas, embed widgets, conditional logic, paid ticket checkout UI.

## Plan gates

| Plan | v1 entitlement |
|------|----------------|
| Basic | Presets + accent; community label only (no logo upload) |
| Core | Community logo + inherit/override |
| Pro | All presets + optional second hero slot (future) |

## Dependencies

- Communities catalog (Epic 6) — extend model, don't replace
- Activity branding (Epic 2/3) — evolve into theme contract
- Campaign assets upload pipeline — reuse for logos
- WCAG NFR-12 — preset QA matrix

## Open questions

1. Should tenant-level brand accent (Settings) cascade to registration when community kit unset?
2. Sync preset colors with website builder `SitePage` accent automatically?
3. Store theme in `form_schema.meta` vs new `registration_theme` JSON column?

## Recommended next BMad steps

1. `bmad-prd` — create intent **Registration Experience Studio**
2. `bmad-ux` — preset mockups + Design tab IA
3. `bmad-create-epics-and-stories` — Epic 25 candidate
4. `bmad-spec` — kernel for `RegistrationTheme` + Community brand fields

## Artifacts

- Recon: `recon-current-state.md`
- Brainstorm: `brainstorm-converge.md`
- Forge: `forged-idea.md`
