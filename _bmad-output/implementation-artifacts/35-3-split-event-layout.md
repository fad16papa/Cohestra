# Story 35.3 — Split Event layout

**Status:** done  
**Accepted:** 2026-09-18  
**Epic:** 35 Modern Form Experience System  
**Depends on:** 35.1 (done), 35.2 (done)

## Acceptance criteria

- [x] When resolved experience layout is `split`, `PublicRegistrationOpen` renders desktop split (~40–45% activity / 55–60% form) via composition around canonical form body (no duplicate RegistrationForm)
- [x] Mobile: single column — hero → activity metadata block → form
- [x] Plan gates unchanged (split allowed Core+ per product rules; 35.1 server gates unchanged)
- [x] Preview parity with public page (draft experience; wider desktop chrome when split)
- [x] Responsive matrix + overflow guards (grid collapse + viewport breakout for split width)
- [x] Regression: Modern Centered, card, immersive, compact, embed unchanged (PublicFormLayout width restored; embed precedes split)

## References

- UX: `_bmad-output/planning-artifacts/ux-designs/ux-form-experience-system-2026-09-18/EXPERIENCE.md` (Split Event)
- PRD FR-FES-3
- Shell routing: `web/lib/registration-public-shell.ts`
