# Story 35.4 — Event Poster / RSVP

**Status:** ready-for-dev  
**Epic:** 35 Modern Form Experience System  
**Depends on:** 35.1–35.3 (done)

## Acceptance criteria

- [ ] When resolved experience layout is `poster`, render poster header block + capacity context before fields via `PublicRegistrationOpen` composition
- [ ] Reuse canonical `RegistrationForm`; no duplicate submit/validation
- [ ] Mobile + desktop responsive behavior per UX EXPERIENCE.md
- [ ] Preview parity; draft experience resolution (no stale persisted resolvedExperience)
- [ ] Plan gates unchanged (35.1)
- [ ] Regression: split, modern centered, card, immersive, compact, embed

## References

- UX Event Poster section in `EXPERIENCE.md`
- PRD FR-FES-3
- `web/lib/registration-public-shell.ts`
