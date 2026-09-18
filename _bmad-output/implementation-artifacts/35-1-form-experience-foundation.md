# Story 35.1 — Form Experience foundation

**Status:** done  
**Accepted:** 2026-09-18 (BMAD loop: code review, adversarial, test architecture, CI run 35363135401 green)
**Epic:** 35 Modern Form Experience System

## Acceptance criteria

- [x] Domain model for layout/style/flow/heroDisplay on registration theme JSON
- [x] Backward compatibility: null experience resolves from legacy preset
- [x] Admin API round-trip via `RegistrationThemeDto.experience`
- [x] Resolved experience on `ResolvedRegistrationThemeDto`
- [x] Plan gate: Basic cannot persist split/poster/conversational; Core cannot persist conversational
- [x] Contract doc `docs/contracts/registration-experience-v1.md`
- [x] Web parser + `resolveRegistrationExperience` helper
- [ ] Renderer consumes resolved experience (Story 35.2+)

## Files

- `src/Domain/Activities/RegistrationExperience.cs`
- `src/Infrastructure/Activities/RegistrationExperience*.cs`
- `web/lib/registration-experience.ts`
