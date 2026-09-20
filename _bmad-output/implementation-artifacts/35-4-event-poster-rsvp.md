# Story 35.4 — Event Poster / RSVP

**Status:** done  
**Accepted:** 2026-09-18  
**Epic:** 35 Modern Form Experience System  
**Depends on:** 35.1–35.3 (done)

## Acceptance criteria

- [x] When resolved experience layout is `poster`, render poster header block + capacity context before fields via `PublicRegistrationOpen` composition
- [x] Reuse canonical `RegistrationForm`; no duplicate submit/validation
- [x] Mobile + desktop responsive behavior per UX EXPERIENCE.md (stacked poster header + form surface)
- [x] Preview parity; draft experience resolution (no stale persisted resolvedExperience)
- [x] Plan gates unchanged (35.1)
- [x] Regression: split, modern centered, card, immersive, compact, embed (shell precedence tests)

## References

- UX Event Poster section in `EXPERIENCE.md`
- PRD FR-FES-3
- `web/lib/registration-public-shell.ts`
