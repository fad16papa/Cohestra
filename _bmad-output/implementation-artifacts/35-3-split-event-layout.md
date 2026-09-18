# Story 35.3 — Split Event layout

**Status:** ready-for-dev  
**Epic:** 35 Modern Form Experience System  
**Depends on:** 35.1 (done), 35.2 (done)

## Acceptance criteria

- [ ] When resolved experience layout is `split`, `PublicRegistrationOpen` renders desktop split (~40–45% activity / 55–60% form) via composition around canonical form body (no duplicate RegistrationForm)
- [ ] Mobile: single column — hero → activity metadata block → form
- [ ] Plan gates unchanged (split allowed Core+ per product rules)
- [ ] Preview parity with public page
- [ ] Responsive matrix + overflow guards
- [ ] Regression: Modern Centered, card, immersive, compact, embed unchanged

## References

- UX: `_bmad-output/planning-artifacts/ux-designs/ux-form-experience-system-2026-09-18/EXPERIENCE.md` (Split Event)
- PRD FR-FES-3
- Shell routing: `web/lib/registration-public-shell.ts`
