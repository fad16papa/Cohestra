# Story 36.4 — Columns + responsive composition

**Epic:** 36  
**Status:** in-progress  
**Depends on:** 36.3 merged (`2c38cb8`)

## User story

As a tenant operator, I can add two-column rows to my registration form so related fields sit side-by-side on desktop and stack cleanly on mobile.

## Acceptance

- [ ] Palette: Structure → 2-column row
- [ ] Exactly two equal columns; mobile stacks left then right (DOM order)
- [ ] fieldRef and content blocks inside columns
- [ ] Section → Columns nesting per architecture (depth cap 3)
- [ ] No columns-in-columns; server/client validation aligned
- [ ] Drag + keyboard reorder; move to left/right column when in scope
- [ ] Delete columns → unwrap children (left then right)
- [ ] Preview fingerprint includes column structure
- [ ] RegistrationCompositionRenderer responsive grid
- [ ] Save/reload integration test
- [ ] Conversational warning includes columns
- [ ] BMAD gates + CI

## Non-goals

- 3+ columns, custom widths, columns in 36.5 design tokens
