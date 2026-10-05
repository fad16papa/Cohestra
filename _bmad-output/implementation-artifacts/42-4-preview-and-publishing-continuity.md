---
id: 42.4
key: 42-4-preview-and-publishing-continuity
title: Preview and publishing continuity
accepted_commit: 2088bb9ec051d41e8d59fb7d621561f2795870a0
implementation_merge: 855bdfc431a93dc8767daa3de0c9fa7bca5f94db
status: done
epic: 42
created: 2026-10-05
baseline_commit: e038692b390bb24ac8e6beb5cba6b9dffec3309c
---

# Story 42.4: Preview and publishing continuity

Status: done

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

## Story

As a TenantAdmin or TenantMember,
I want Build, Preview, Publish, success, and revert to feel like one Creation Studio workflow,
so that I can trust the draft I am editing is the draft visitors will see, and I can return to saved/published truth without leaving the studio.

## User problem and evidence

Original backlog (pre-42.1/42.2/42.3/#388) assumed Preview/publish felt like a different product, templates hid composition, and Website Preview unmount was easy to regress. Delta audit on `e038692b` shows most of that already shipped. Remaining: Form first-fold templates still hide composition; Form Preview is unnamed; dirty Form has no revert-unsaved.

See investigation companion.

## Already satisfied (OUT OF SCOPE)

Do not reimplement:

- Form Build/Preview tabs and unsaved `draftSchema` Preview
- Form Preview unmount (`keepMounted={false}`) and Build stay-mount
- Debounced `previewKey` remount / simulated-submit isolation
- `PublicRegistrationOpen` preview variant (no public write)
- Form Overview publish success `role=status` + header `Published` + Form `Live —`
- Website 42.1 Preview unmount, named Website preview, publish dialog, revert live site
- 42.2 D7 compositions
- 42.3 44×44 touch/pointer/keyboard
- #388 container queries, poster 480, Basic/Core/Pro website-connection matrix
- Epic 35/36 public renderer contracts
- Epic 37 motion tokens

## Remaining scope

1. Compact Templates when the draft already has fields; sticky **Go to composition**.
2. Named Form Preview region `Registration preview`.
3. **Revert unsaved** restores last saved schema (confirm).
4. Tests proving CAP-1–CAP-8 and protected regressions. Hidden Preview must have evidence it is unmounted during Build edits.

## Roles, plans, routes, and states

Unchanged. Route stays `/activities/{id}?tab=form` and `/website`. Archived Form remains read-only (no revert). Publish stays on Overview. Website revert stays published-homepage snapshot.

## Architecture decision

**Ratify existing lifecycle. No new spine.**

Parent owns draft. Preview renders only when active. Revert unsaved is local state reset. No second renderer.

## Explicit non-goals

Epic 43. Studio redesign. New shells/fields/schema/entitlements. Moving Publish onto Form. New success dialog. Iframe Preview. Hidden mounted Preview.

## Acceptance Criteria

1. Build → Preview shows the latest unsaved Form draft without requiring Save. Preview does not mutate the draft. Returning to Build preserves draft fields, composition, Website connection, Design draft input, and editor mount.
2. While Build is active, `#form-studio-preview-panel` is not in the DOM. Typing in Build does not mount `PublicRegistrationOpen`. Source continues to use `keepMounted={false}` on Preview (not `display:none` keep-alive).
3. Form Preview surface is a region named `Registration preview`. No iframe is introduced. Website region `Website preview` remains.
4. When the draft has fields, Templates start collapsed behind a `Templates` summary (≥44px). Sticky chrome has `Go to composition` pointing at `#form-studio-composition`. Composition heading remains `Form builder` h2. Empty drafts may keep Templates open.
5. Dirty, non-archived Form shows `Revert unsaved`. Confirm restores last saved schema, clears dirty, updates Preview, and does not call publish/unpublish APIs. Cancel leaves the draft intact.
6. Preview submit remains simulated. Material schema/theme `previewKey` remount or leaving Preview resets simulated success. Unrelated keystrokes that do not change `previewKey` do not remount.
7. Form publish success remains Overview status + header Published + Form Live copy. Failure remains `role=alert` with draft intact and no false Published badge. Website publish/revert 42.1 behavior unchanged.
8. 42.2 compositions, 42.3 handles, and #388 website-connection/responsive contracts are unchanged. Light/dark/reduced-motion remain. No new serious/critical Axe violations on Form Build/Preview. One `main#main-content`, one document `h1`.
9. Tests use owned/isolated fixtures (38.3). No shared demo theme mutation.
10. Epic 43 is not started.

## Protected contracts

Epic 35–37; 38.3–38.6; 39.4; 42.1; 42.2; 42.3; registration-responsive-tenant-website (#388).

## Automated and visual QA

Vitest source contracts + Form 42.4 Playwright at 1440 / 1024 / 390 (Build, Preview, jump, revert). Run 42.1 / 42.2 / 42.3 / #388 / 35–36 protected suites as regressions. Evidence under `px2-42-4/`.

## Exact stop gate

Story 42.4 `review` then DONE on the same HEAD that passed review + acceptance. Epic 42 stays in-progress until cross-story close. Epic 43 not started.

## Tasks / Subtasks

- [x] Investigation + spec + party direction recorded
- [x] Compact Templates + Go to composition (AC #4)
- [x] Named Registration preview region (AC #3)
- [x] Revert unsaved (AC #5)
- [x] Preserve unmount / draft Preview / simulated submit (AC #1, #2, #6)
- [x] ATDD + protected regressions (AC #7–#10)

## Dev Notes

- `FormTemplatePicker`: native `details`/`summary`, `defaultOpen={!compactDefault}`.
- Composition anchor: `id="form-studio-composition"` on the Form builder wrapper.
- Revert: `setDraftSchema(normalizeFormSchema(activity.formSchema))`.
- Do not hoist publish controls. Do not restyle Website Preview.

### References

- [Source: spec-42-4-preview-and-publishing-continuity]
- [Source: story-42-4-preview-publishing-continuity-investigation.md]
- [Source: `_bmad/custom/mandatory-code-review-loop.md`]

## Readiness

PASS. Spec exists, delta classified, architecture ratified (no new spine), protected contracts listed, ATDD targets named, non-goals explicit.

## Dev Agent Record

### Agent Model Used

Grok 4.6

### Debug Log References

See `_bmad-output/planning-artifacts/evidence/px2-42-4/`.

### Completion Notes List

- Delta audit: most original 42.4 backlog already shipped in 42.1–42.3 and #388.
- Remaining: compact Templates, Go to composition, named Registration preview, Revert unsaved, close Build overlays on Preview.
- Code review PASS after overlay fix. Checkpoint: CONTINUATION. PR #391 merged `855bdfc4`.
- Epic 43 not started.

### File List

- `_bmad-output/implementation-artifacts/investigations/story-42-4-preview-publishing-continuity-investigation.md`
- `_bmad-output/implementation-artifacts/investigations/party-42-4-preview-publishing-continuity.md`
- `_bmad-output/planning-artifacts/specs/spec-42-4-preview-and-publishing-continuity/`
- `_bmad-output/implementation-artifacts/42-4-preview-and-publishing-continuity.md`
- `web/components/activities/activity-form-tab.tsx`
- `web/components/activities/form-template-picker.tsx`
- `web/components/activities/form-composition-builder.tsx`
- `web/components/registration/registration-public-preview-shell.tsx`
- `web/lib/form-studio-42-4.test.ts`
- `web/e2e/form-studio-42-4.spec.ts`
