---
epic: 25
story: 3
status: done
baseline_commit: f5c6005
---

# Story 25.3: Public registration preset renderer

Status: done

## Story

As a **prospective registrant**,
I want **the registration page layout to match the operator's chosen preset**,
So that **the page feels intentional and trustworthy on mobile**.

## Acceptance Criteria

1. **Given** preset Classic  
   **Then** current hero + form layout unchanged (backward compatible)

2. **Given** preset Card or Compact  
   **Then** layout matches DESIGN.md component tokens

3. **Given** resolved accent  
   **Then** CSS `--primary` applies on registration root

## Tasks / Subtasks

- [x] **Task 1 — Preset layouts** (AC: 1, 2)
  - [x] `PublicRegistrationOpen` branches: classic, card, immersive, compact
  - [x] `ActivityHero` preset-specific sizing + logo support

- [x] **Task 2 — Accent CSS variable** (AC: 3)
  - [x] Apply `style={{ "--primary": accentColor }}` on preset root containers

- [x] **Task 3 — Public page wiring** (AC: 1–3)
  - [x] Pass `preset`, `logoAssetId`, `accentColor` from public activity API

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Classic preset preserves existing hero + form stack spacing.
- Card, immersive, and compact presets use distinct layout shells per UX spec.
- Resolved accent drives `--primary` on the registration root for CTA/button theming.

### File List

- `web/components/registration/public-registration-open.tsx`
- `web/components/registration/activity-hero.tsx`
- `web/lib/registration-theme-utils.ts`
- `web/app/(public)/register/[slug]/page.tsx`

## Change Log

- 2026-08-12: Implemented public preset renderer layouts and accent CSS variable wiring.
