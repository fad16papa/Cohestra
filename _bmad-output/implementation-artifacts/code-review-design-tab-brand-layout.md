# Code Review: Design Tab Brand Layout Independence (PR #191)

**Reviewed:** `main...1742dcb` on `cursor/fix-design-tab-brand-layout-4da3`  
**Spec:** `_bmad-output/implementation-artifacts/25-4-admin-design-tab-live-preview.md`  
**UX addendum:** `_bmad-output/planning-artifacts/registration-design-tab-ux-fix/EXPERIENCE-addendum.md`  
**Date:** 2026-08-15

## Verdict

**Approve — no blocking patches.** CSS-only fix correctly decouples brand panel height from layout preset preview stretch. Story 25.4 and UX addendum acceptance criteria met.

## Layer summary

| Layer | Result |
|-------|--------|
| Blind Hunter | No findings |
| Edge Case Hunter | 8 findings (see triage — all defer/dismiss) |
| Acceptance Auditor | All AC met; 3 minor non-blocking gaps |

---

## Triage

### dismiss — Redundant `self-start` on brand card

**Location:** `activity-design-tab.tsx:217`  
**Source:** auditor  
**Detail:** Parent `lg:items-start` already prevents stretch; child `self-start` is redundant but documents intent per UX addendum. Harmless.

---

### defer — Left-column whitespace when preview taller than brand panel

**Location:** `activity-design-tab.tsx:216-337`  
**Source:** edge  
**Detail:** After fix, immersive preview can leave visual whitespace beside a shorter brand card. This is the intended tradeoff (content-driven brand height). Optional P1: sticky brand panel or preview `max-h` + internal scroll (already noted in brainstorm P1).

---

### defer — Immersive preset still inflates overall page scroll

**Location:** preview via `PublicRegistrationOpen` / `ActivityHero`  
**Source:** edge  
**Detail:** `min-h-[40vh]` hero on immersive preset pushes preview column height. Not introduced by this PR; cap preview viewport in a follow-up.

---

### defer — Brand controls scroll away on long preview

**Location:** `activity-design-tab.tsx:216-337`  
**Source:** edge  
**Detail:** Without sticky positioning, operators must scroll back up to edit brand after inspecting tall preview. UX polish, not regression.

---

### defer — Viewport toggle buttons lack `aria-pressed`

**Location:** `activity-design-tab.tsx:342-367`  
**Source:** edge  
**Detail:** Pre-existing a11y gap; active Mobile/Desktop mode not exposed to assistive tech. Out of scope for this CSS fix.

---

### defer — Breakpoint flip at `lg` (1024px)

**Location:** `activity-design-tab.tsx:216`  
**Source:** edge  
**Detail:** Stack-to-columns transition at `lg` is pre-existing. No change in this diff.

---

### defer — Tablet preset grid (2 cols) vs stacked brand/preview

**Location:** `activity-design-tab.tsx:183-216`  
**Source:** edge  
**Detail:** Preset tiles use `sm:grid-cols-2`; brand/preview side-by-side only at `lg`. Pre-existing layout rhythm.

---

### dismiss — 200% zoom label spacing

**Location:** `activity-design-tab.tsx:183-185`  
**Source:** edge  
**Detail:** `space-y-3` → `space-y-4` is standard token step; no evidence of clipping at zoom in code review.

---

## Acceptance checklist

| Criterion | Status |
|-----------|--------|
| Story 25.4 — preset picker, inherit, overrides | ✅ Unchanged |
| Story 25.4 — mobile/desktop preview toggle | ✅ Unchanged |
| Story 25.4 — `PublicRegistrationOpen variant="preview"` | ✅ Unchanged |
| Story 25.4 — WCAG contrast warning | ✅ Unchanged |
| UX — brand card height independent of preset | ✅ Fixed |
| UX — layout preset label spacing | ✅ Fixed |
| UX — preview updates for all presets | ✅ Unchanged |

---

## Recommended follow-ups (optional, not blocking merge)

1. **P1:** Preview wrapper `max-h-[70vh] overflow-y-auto` for immersive/desktop mode
2. **P1:** `lg:sticky lg:top-4` on brand card for long-preview editing
3. **P2:** `aria-pressed` on Mobile/Desktop toggle buttons
