# Story 36.3 — Content blocks + sections

**Epic:** 36  
**Status:** in-progress  
**Depends on:** 36.2 merged (`3f2d4fe`)

## User story

As a tenant operator, I can add headings, paragraphs, dividers, and sections to my registration form so registrants see context and structure—not only input fields.

## Scope

- Content blocks: heading, paragraph, divider (no image in 36.3)
- Section blocks with nested children (fieldRef + content)
- Palette groups: Input | Content | Structure
- Mixed composition reorder (drag + keyboard)
- Canonical Preview + public render via `RegistrationCompositionRenderer`
- Presentation blocks excluded from submission payload

## Acceptance

- [ ] Content blocks in palette and canvas
- [ ] Section with inspector title/description + nested canvas rows
- [ ] Mixed reorder + keyboard within container
- [ ] Preview/public render mixed order
- [ ] Save/reload + v1 promotion
- [ ] Tests + CI + checkpoint

## Out of scope

- Columns (36.4), image content, domain blocks (36.7)
