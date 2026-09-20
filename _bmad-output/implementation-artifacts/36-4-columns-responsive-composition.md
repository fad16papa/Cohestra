# Story 36.4 — Columns + responsive composition

**Epic:** 36  
**Status:** done  
**Depends on:** 36.3 merged (`2c38cb8`)  
**Implementation HEAD:** (see merge commit on `main`)

## User story

As a tenant operator, I can add two-column rows to my registration form so related fields sit side-by-side on desktop and stack cleanly on mobile.

## Acceptance

- [x] Palette: Structure → 2-column row (Core+; Basic locked UI + server gate per FR-FS2-27/29)
- [x] Exactly two equal columns; mobile stacks left then right (DOM order)
- [ ] fieldRef and content blocks inside columns
- [ ] Section → Columns nesting per architecture (depth cap 3)
- [ ] No columns-in-columns; server/client validation aligned
- [ ] Drag + keyboard reorder; move to left/right column when in scope
- [ ] Delete columns → unwrap children (left then right)
- [ ] Preview fingerprint includes column structure
- [ ] RegistrationCompositionRenderer responsive grid
- [ ] Save/reload integration test
- [ ] Conversational warning includes columns
- [x] BMAD gates + CI (Playwright `form-studio-columns-36-4.spec.ts` + dotnet/vitest suites)

## Entitlements (canonical PRD)

- **FR-FS2-26 Basic:** no columns (sections + content only)
- **FR-FS2-27 Core+:** columns included
- **FR-FS2-29:** server enforcement — `FormSchemaPlanGate`, `ActivityService` / template save paths, integration test `SaveFormSchema_BasicTenantColumnsComposition_Returns403PlanLocked`

## Empty columns

- New rows seed `[[], []]` (no placeholder headings)
- Save blocked while a column is empty (client + server validators)
- Builder shows dashed **Left/Right column — drag blocks here** drop targets

## Non-goals

- 3+ columns, custom widths, columns in 36.5 design tokens
