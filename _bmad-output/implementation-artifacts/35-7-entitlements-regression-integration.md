# Story 35.7 — Entitlements, Activity context, and Epic integration

**Status:** done  
**Epic:** 35 Modern Form Experience System  
**Depends on:** 35.1–35.6 (done)

## Acceptance criteria

- [x] Epic-wide entitlement and regression evidence recorded (`35-7-epic-verification-matrix.md`, integration + unit tests)
- [x] Live browser matrix cleared — CI run **35454127263** @ HEAD `c0e9fcc` (Docker smoke: 29 Playwright tests including Form Studio Design + Preview)
- [x] PRD traceability for Epic 35 complete (see matrix artifact)

## Deliverables in 35.7

- `web/e2e/form-experience-epic-35.spec.ts` — live matrix + conversational + Form Studio preview path
- `deploy/ci-docker-smoke.sh` — runs Epic 35 e2e after stack healthy
- Expanded `ActivityRegistrationExperiencePlanIntegrationTests` (poster Basic, conversational Core)
- `RegistrationExperiencePlanGateTests` poster Basic unit test
- Formal adversarial artifact (`35-7-adversarial-review.md`)

## Inherited debt closure

| Debt | Resolution |
|------|------------|
| Live responsive matrix | Playwright @ 6 widths × 4 experiences in CI Docker |
| Form Studio → Preview | E2e spec: Design split → Form Preview without save |
| Conversational interaction | E2e spec: Next/Back/validation smoke @ 390px |
| Formal BMAD reviews | Adversarial doc; testarch via e2e + suites; checkpoint = CI browser |

## References

- `_bmad-output/planning-artifacts/epics-form-experience-system-35.md`
- PRD Form Experience System
