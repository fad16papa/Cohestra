# Story (follow-up) — Modern Centered visual-quality correction

**Status:** backlog (post–Epic 35 defect investigation)  
**Epic:** New follow-up (do **not** reopen Epic 35)

## Problem

When `resolvedExperience.layout === "centered"` and preset is `classic`, public registration is structurally identical to pre–Epic 35 Classic (hero stack + narrow column). The **style** dimension is persisted and resolved but **not applied** in `web/components/registration/*`, so “Modern Centered” can look unchanged to operators expecting event-grade polish (PRD success metric).

## Scope

Improve Modern Centered presentation only:

- Activity hierarchy, hero composition, metadata, typography, field surfaces, rhythm, CTA, footer, capacity/context  
- Keep: `PublicRegistrationOpen`, shared `RegistrationForm`, validation, submission, Preview parity, entitlements  
- Responsive: 1440 / 1024 / 768 / 430 / 390 / 360

## Out of scope

- Split / Poster / Conversational shells (unless regression)  
- New experience dimensions or entitlement changes

## Acceptance (draft)

- [ ] Visually distinguish Modern Centered from legacy Classic in side-by-side checkpoint (desktop + mobile)  
- [ ] Apply at least `style: modern` vs `minimal` tokens where PRD defines them  
- [ ] No duplicate renderer; Preview matches public  
- [ ] Regression: entitlements, conversational, split/poster paths unchanged

## Evidence trigger

Confirm via public API for operator activity (e.g. `/register/fnm`) that `resolvedExperience.layout` is `centered` and operator expected Modern Centered — not Split/Poster blocked by plan.
