# Story 36.3 — Content blocks + sections

**Epic:** 36  
**Status:** done  
**Depends on:** 36.2 merged (`3f2d4fe`)  
**Final HEAD:** `0e0c4ad`  
**PR:** #328  
**CI:** run `35507075994` (6/6 SUCCESS)

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

- [x] Content blocks in palette and canvas
- [x] Section with inspector title/description + nested canvas rows
- [x] Mixed reorder + keyboard within container
- [x] Preview/public render mixed order
- [x] Save/reload + v1 promotion (builder + API integration)
- [x] Tests + CI + checkpoint

## Evidence

- Recursive preview fingerprint: `web/lib/form-composition-preview-fingerprint.ts`
- Mixed API round-trip: `FormSchemaCompositionIntegrationTests.SaveFormSchema_MixedComposition_RoundTripsNestedStructure`
- Submission safety: `SubmitPublicRegistration_MixedComposition_PersistsOnlyFieldAnswers`
- Live checkpoint: `/opt/cursor/artifacts/36-3-checkpoint-final-report.md`
- Reviews: `/opt/cursor/artifacts/bmad-36-3-*.md`

## Out of scope

- Columns (36.4), image content, domain blocks (36.7)
