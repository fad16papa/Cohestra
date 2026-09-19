# Story 35.6 — Form Studio Experience controls

**Status:** done  
**Epic:** 35 Modern Form Experience System  
**Depends on:** 35.1–35.5 (done)

## Acceptance criteria

- [x] Form Studio Design tab exposes Experience dimensions per UX artifact (Layout, Style, Flow, Brand grouping)
- [x] Draft experience edits reflect in Preview without stale persisted `resolvedExperience`
- [x] Plan entitlements surface in UI consistent with server gates (35.1 / 35.7 boundaries)
- [x] No regression to field editor, preview safety, or public registration renderer

## Implementation

- `RegistrationExperienceControls` — accessible radio cards for Layout, Flow, Style
- `registration-experience-studio.ts` — plan gates (informational), draft apply helpers, save payload
- `ActivityDesignTab` — Experience / Advanced layouts / Brand sections; saves `experience` via existing API
- `ActivityDetailPageClient` + `ActivityFormTab` — shared `designDraftTheme` for Form Preview unsaved experience

## Verification

- Vitest: `registration-experience-studio`, `form-studio-design-tab`, `form-studio-preview-key`, full web suite
- Live Form Studio operator flow: **EPIC DEBT** (contract/source tests only)

## References

- `_bmad-output/planning-artifacts/epics-form-experience-system-35.md`
- `_bmad-output/planning-artifacts/ux-designs/ux-form-experience-system-2026-09-18/EXPERIENCE.md`
- `_bmad-output/planning-artifacts/architecture-form-experience-system-2026-09-18.md`
