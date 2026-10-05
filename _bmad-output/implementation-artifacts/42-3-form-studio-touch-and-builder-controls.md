---
id: 42.3
key: 42-3-form-studio-touch-and-builder-controls
title: Form Studio touch and builder controls
status: done
epic: 42
created: 2026-10-05
baseline_commit: 53bd0c11e5c80da0b1b9da1a0faf66b9f6415d9f
accepted_commit: 712a5395d68e2b8db78c13f3168714e7ddc676ba
implementation_merge: 0bb9ac258f31eed7d2a3bd629ea0dfa3568c3cf6
---

# Story 42.3: Form Studio touch and builder controls

Status: done

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

Code review is repeating, not one-shot. Do not mark done from implementation alone. There is no `bmad-close-story` skill.

## Story

As a TenantAdmin or TenantMember,
I want Form Studio reorder handles and the attached action cluster to be usable with a finger as well as mouse and keyboard,
so that I can reorder composition blocks on mobile without losing keyboard operation, schema behavior, Story 42.2 composition, or plan entitlements.

## User problem and evidence

Canvas handles are `touch-none` plus `p-1` / `GripVertical size-4` (~24px). Move up/down/delete use `Button size="icon-xs"` (24px). HTML5 `draggable` on the handle does not fire a usable touch drag in mobile browsers, so the coded primary reorder is mouse-only. Keyboard Move up/down exist. Website Studio section handles share the same small `touch-none` grip (Website already has a pointer path). Evidence: backlog §42.3, PX2-TOUCH-002, DESIGN.md §14 icon floors, `form-composition-builder.tsx`, `website-section-fields.tsx`.

## Current inventory

See `px2-42-3/inventory.md` and `px2-42-3/dnd-sensors.md`.

- No third-party DnD library. Form Studio uses HTML5 drag on an explicit handle plus `reorderCompositionBlocks`. Keyboard uses Move up/down calling the same function.
- Website Studio uses HTML5 drag **and** pointer capture on the section grip; keyboard ArrowUp/ArrowDown plus mobile Move up/down.
- `FormFieldEditor` list handles are the same 24px pattern but are **not mounted** on Form Studio (inspector-only). Disposition: Story 43.5 unless a Form Studio path remounts that list.
- Story 42.2 D7 shell is closed and must stay: ≥1280 three-pane, 1024–1279 two-pane + collapsible inspector, <1024 Sheet.

## Roles, plans, routes, and states

See `px2-42-3/role-plan-state-matrix.md`. Do not change role, plan, activity-status, or operation permissions. Archived/read-only cannot reorder. Basic can reorder supported basic items. Plan-gated inserts stay named.

## Architecture decision

**Enlarge the existing explicit handle and action cluster. Add a pointer sensor on the Form Studio handle that calls the same `reorderCompositionBlocks` path. Do not add a DnD library.**

Rejected: whole-row drag; replacing HTML5 with a library; removing keyboard; treating `touch-none` as touch support; product-wide 44px sweep.

## Explicit non-goals

Story 42.4, Epic 43, composition schema / renderer / submit payload, DnD-library migration, Website Studio redesign, Story 42.2 composition changes, production claim. Do not invent a second reorder operation.

## Acceptance Criteria

1. Each Form Studio composition row has an explicit handle ≥44×44 CSS pixels, named `Reorder {item name}`, keyboard reachable, with a visible focus indicator. Drag starts only from the handle. Row body, select/edit, Move up/down, and delete do not start a drag. Vertical swipe on the row body scrolls.
2. Mouse, touch/pointer, and keyboard reorder all call the existing `reorderCompositionBlocks` path and produce the same schema result. HTML5 mouse drag remains. Touch uses pointer capture on the handle only (`touch-action: none` scoped to the handle). Tap without a qualifying move, cancel, and drop-on-self do not change schema.
3. Move up / Move down remain. First-up and last-down are disabled no-ops. After a successful reorder, focus stays on the moved item’s handle (or equivalent surviving control), selection and inspector stay on that item, and the draft is dirty. A polite live region announces the new position.
4. Primary cluster controls on the affected Form Studio row (handle, Move up, Move down, select/edit, delete) meet the 44×44 floor. No product-wide 44px sweep. `icon-xs` variant stays for unrelated chrome.
5. Website Studio section handles share the measured 24–32px `touch-none` defect. Apply the same 44px explicit-handle correction and 44px mobile Move up/down. Preserve Story 42.1 composition, preview unmount, and section operations. No Website redesign.
6. Archived/read-only handles and cluster controls cannot reorder. Basic remains able to reorder supported basic items. Core column entitlements and named plan locks stay unchanged.
7. Story 42.2 D7 compositions, single inspector, inert cleanup, and preview-unmount contract remain. Drag overlays unmount after drop/cancel/navigation. Resize does not save or refetch.
8. Light/dark/forced-colors/reduced-motion/200% zoom remain usable. Reduced motion does not remove functional drag feedback. No new serious/critical Axe violations. One `main#main-content`, one document `h1`, Form builder stays `h2`.
9. No backend, schema, public-renderer, entitlement, or library-version change. No new localStorage draft. No cross-activity drag state.
10. Protected 36.2/36.4–36.7, 37, 38.3–38.6, 39.4, 40.5, 42.1, and 42.2 suites remain intact. Story 42.4 and Epic 43 are not started.

## Protected contracts

Epic 35 Form Experience; 36.2 field/section operations; 36.4 columns; 36.5 tokens; 36.6 preview; 36.7 entitlements; Epic 37 builder motion; 38.3 isolation; 38.4 tokens; 38.5 landmarks; 38.6 overlays; 39.4 PageHeader; 40.5 continuity; 42.1 Website Studio; 42.2 D7 Form Studio.

## Automated and visual QA

Affected + full Vitest, `tsc`, targeted ESLint, Next production build, Story 42.3 Playwright at 390, 430, 767, 768, 1023, 1024, 1279, 1280, 1440 with real touch plus mouse and keyboard, plus protected regressions. Evidence under `px2-42-3/`.

## Exact stop gate

Story 42.3 `review`. Stories 42.1 and 42.2 remain `done`. Epic 42 `in-progress`. 42.4 not started. Epic 43 not started. One draft PR open and unmerged. Production not claimed.

## Tasks / Subtasks

- [x] Inventory, readiness, and architecture recorded under `px2-42-3/` (AC: all)
- [x] Shared 44px explicit handle + Form Studio pointer sensor using existing reorder (AC: #1, #2, #3)
- [x] Form Studio action cluster 44px; keyboard and live region (AC: #3, #4)
- [x] Website section handle 44px + focused 42.1 regression (AC: #5)
- [x] Role/plan/archived and D7 protection (AC: #6, #7, #8, #9)
- [x] Playwright 42.3 + protected suites (AC: #8, #10)

## Dev Notes

- Do not add `@dnd-kit` or replace HTML5 for mouse. Pointer sensor is the existing Website pattern applied to Form Studio so touch can call the same mutation.
- `touch-none` / `touch-action: none` only on the explicit handle.
- Accessible name is `Reorder {item}`, not `Drag to reorder {item}`.
- Do not change `reorderCompositionBlocks` semantics.
- If a library migration appears required, stop and run `bmad-correct-course`.

### Project Structure Notes

- Route stays `/activities/{id}?tab=form`
- Canvas chrome: `web/components/activities/form-composition-builder.tsx`
- Shared handle: `web/components/builder/builder-reorder-handle.tsx`
- Website: `web/components/website/website-section-fields.tsx` handle only
- Do not fork a mobile builder

### References

- [Source: `_bmad-output/planning-artifacts/cohestra-product-experience-2-backlog.md` §42.3]
- [Source: `docs/DESIGN.md` §14 icon floors]
- [Source: `_bmad/custom/mandatory-code-review-loop.md`]

## Dev Agent Record

### Agent Model Used

Grok 4.6 (primary). Composer 2.5 unused — no isolated presentational slice after the contract was locked.

### Debug Log References

See `_bmad-output/planning-artifacts/evidence/px2-42-3/`.

### Completion Notes List

- Shared `BuilderReorderHandle` is 44×44, named `Reorder {item}`, `touch-none` only on the handle.
- Form Studio keeps HTML5 mouse drag and Move up/down; touch/pen uses pointer capture plus document listeners and calls `reorderCompositionBlocks`.
- Website Studio shared the small-handle defect; same handle + 44px mobile Move up/down. No Website redesign.
- Four-layer review on this HEAD: no remaining independently verified BLOCKER/MAJOR.
- Story stays at `review`. Not marked done. PR remains draft.

### File List

- `web/components/builder/builder-reorder-handle.tsx`
- `web/lib/builder-pointer-reorder.ts`
- `web/components/activities/form-composition-builder.tsx`
- `web/components/website/website-section-fields.tsx`
- `web/e2e/form-studio-42-3.spec.ts`
- `web/e2e/website-studio-42-3.spec.ts`
- `web/lib/builder-pointer-reorder.test.ts`
- `web/lib/builder-pointer-reorder.dom.test.ts`
- `web/lib/builder-reorder-handle.test.ts`
- `web/lib/builder-reorder-equivalence.test.ts`
- `_bmad-output/implementation-artifacts/42-3-form-studio-touch-and-builder-controls.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/evidence/px2-42-3/`

### Change Log

- 2026-10-05: Created Story 42.3 from synchronized `main` `53bd0c11`. Epic 42 remains in-progress. 42.1–42.2 remain done. 42.4 not started.
- 2026-10-05: Implementation, tests, and four-layer review complete. Status `review`. Draft PR #387.
