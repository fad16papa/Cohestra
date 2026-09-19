# Story 35.5 — Conversational flow (Pro)

**Status:** done  
**Epic:** 35 Modern Form Experience System  
**Depends on:** 35.1–35.4 (done)

## Acceptance criteria

- [x] When resolved experience flow is `conversational`, step through fields in `PublicRegistrationOpen` without duplicating RegistrationForm domain logic
- [x] Pro plan entitlement enforced server-side (35.1); no new ad-hoc gates
- [x] Preview parity; draft flow resolution
- [x] Accessibility: step progress, keyboard, reduced motion
- [x] Regression: all layout shells from 35.2–35.4

## Implementation notes

- `RegistrationForm` `flowMode`: shared validation, values, and `performSubmit` / preview submit path
- `listConversationalSteps` — schema-ordered visible steps; clamp on schema shrink
- `PublicRegistrationOpen` resolves flow via `resolveRegistrationExperience`; form `key` resets on flow/schema change
- Final submit navigates to first invalid conversational step when full validation fails (conditional/hidden edge)

## Verification

- Web: vitest (conversational-form-steps, registration-preview-theme, registration-responsive, full suite), `npm run build`
- .NET: `RegistrationExperiencePlanGateTests` (conversational Pro gate)
- Live responsive/interaction matrix: **EPIC DEBT** (contract/CSS only for Conversational in this story)

## References

- UX Conversational section in `EXPERIENCE.md`
- PRD FR-FES-3 / FR-FES-7
