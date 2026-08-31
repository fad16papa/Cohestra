# Brownfield

No starter template. Extend `Cohestra.sln` + `web/`.

## Touchpoints

- `FormFieldTypes.cs`, `FormSchemaValidator.cs`, `PublishGateValidator.cs`
- `RegistrationAnswerValidator.cs`, `ClientProfileExtractor.cs`
- `docs/contracts/activity-form-schema-v1.md` (document additive types as v1.1; version stays 1)
- `web/lib/form-schema-utils.ts`, `web/lib/form-templates.ts`
- `form-template-picker.tsx`, `activity-form-tab.tsx`
- Public `registration-form.tsx`, success / unavailable
- Outbox + `RegistrationConfirmationEmailBuilder.cs` (piping only; do not fork hero)
- Phase 3: `web/content-security-policy.ts`, nginx, website builder Contact section

## Do not change

- `TenantPlanLimits` registration/seat/community/activity caps
- Studio Design tab / `registration_theme` storage
- Public route `/register/{slug}` as the Participant IA

## Story order

Implement `epics-registration-capture.md`: 30.1 → 30.13, then 31.x, then 32.x. Do not start 32 before 30. Templates last in 30.
