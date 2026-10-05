---
id: SPEC-42-4-preview-and-publishing-continuity
companions:
  - _bmad-output/implementation-artifacts/investigations/story-42-4-preview-publishing-continuity-investigation.md
  - _bmad-output/implementation-artifacts/investigations/party-42-4-preview-publishing-continuity.md
sources:
  - _bmad-output/planning-artifacts/cohestra-product-experience-2-backlog.md
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability only.

# Story 42.4 — Preview and publishing continuity (delta)

## Why

**Pain to solve.** After 42.1–42.3 and #388, Creation Studios already share Build / Preview / Publish language, draft Preview, and Preview unmount. Remaining friction: Form Build first fold still leads with Templates so composition is off-screen; Form Preview is not a named region; a dirty Form has no confident return to last saved (published) truth. Operators should feel they never left one studio workflow.

## Capabilities

- **CAP-1**
  - **intent:** Operator can open Preview and see the current unsaved Form draft as a visitor would, then return to Build with editor state intact.
  - **success:** No save is required to Preview. `draftSchema` is what Preview renders. Build panel stays mounted. Website in-studio Preview continues to show local draft.
- **CAP-2**
  - **intent:** While Build is active, the heavy public-registration Preview tree does no meaningful render/remount work.
  - **success:** Form Preview `BuilderSurface` uses `keepMounted={false}` and is absent from the DOM on Build. No `display:none` mounted `PublicRegistrationOpen`.
- **CAP-3**
  - **intent:** Assistive technology can find Form Preview by name.
  - **success:** Preview surface exposes `role="region"` and accessible name `Registration preview`. No iframe is added.
- **CAP-4**
  - **intent:** On a form that already has fields, Templates do not own the first fold; composition is reachable without hunting.
  - **success:** Templates start collapsed when `draftSchema.fields.length > 0`. Sticky Build chrome includes `Go to composition` targeting `#form-studio-composition`. Empty forms may keep Templates expanded.
- **CAP-5**
  - **intent:** Operator can discard unsaved Form edits and return to last saved truth.
  - **success:** `Revert unsaved` (confirm) restores `activity.formSchema`. Dirty clears. Preview matches reverted draft. No public write. Website revert-published remains unchanged.
- **CAP-6**
  - **intent:** Preview submit stays a simulation.
  - **success:** No registration row is created. Simulated success resets when Preview remounts on material `previewKey` or when Preview unmounts.
- **CAP-7**
  - **intent:** After Form publish, the operator can answer “is this public?” without a disappearing toast.
  - **success:** Existing Overview `Activity is live.` status, header `Published` badge, and Form `Live —` copy remain. No new Form publish dialog or banner.
- **CAP-8**
  - **intent:** Website Studio Build / Preview / Publish / Revert stays the 42.1 product.
  - **success:** Named `Website preview` region, Preview unmount in Build, persist publish dialog + status, revert confirm. No Website chrome redesign.

## Constraints

- MUST NOT create `FormStudioPreviewRendererV2` or any second public/preview renderer.
- MUST NOT add field types, public shells, schema columns, or entitlement changes.
- MUST NOT reopen 42.1 / 42.2 / 42.3 / #388 behavior unless a regression is proven.
- MUST NOT start Epic 43 or stories 43.1–43.5.
- MUST preserve `@container` registration roots, `@min-[640px]` / `@min-[1024px]`, poster 480, public-only split breakout, Basic website option ABSENT, Core/Pro OPTIONAL.
- MUST preserve 42.2 D7 compositions and 42.3 44×44 handle/pointer/keyboard contracts.
- MUST use Epic 37 builder motion primitives only; reduced motion respected; motion cannot delay state correctness.
- MUST use 38.3 owned/isolated fixtures; do not mutate shared demo themes.
- SHOULD keep Overview as Form publish home.
- MAY collapse Templates with native `details`/`summary`.
- MAY keep Website Phone/Desktop preview chrome distinct from Form Mobile/Tablet/Desktop.

## Non-goals

- Redesigning Form Studio or Website Studio.
- Moving activity Publish into the Form tab.
- Form revert-of-published-snapshot (saved form is published truth when Live).
- New toast-primary success, noisy banners, or “Just now” clock unless already present.
- Forcing visual sameness of Preview chrome across studios.
- Hidden mounted Preview for faster tab switches.

## Success signal

An operator on a populated Form can stay in one studio: edit draft → Preview that draft → return to the same Build selection → jump to composition without the template gallery blocking the first fold → revert unsaved to saved/published truth → publish from Overview and still see a persistent Published/Live confirmation. Website Studio still feels like the same Publish/Preview product it was after 42.1.

## Assumptions

- Current HEAD already satisfies draft Preview, unmount, simulated submit, Website success dialog, and #388 responsive/entitlement contracts.
- Party resolution (compact + jump + revert unsaved + named region) is the only implementation slice.

## Open Questions

None. Remaining original backlog items are classified ALREADY SATISFIED or SUPERSEDED in the investigation companion.
