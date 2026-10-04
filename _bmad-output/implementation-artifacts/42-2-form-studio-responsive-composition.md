---
id: 42.2
key: 42-2-form-studio-responsive-composition
title: Form Studio responsive composition (D7)
status: in-progress
epic: 42
created: 2026-10-04
baseline_commit: eabc03fffee324e0ad90d07007a8dcfe8e812378
---

# Story 42.2: Form Studio responsive composition (D7)

Status: in-progress

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

Code review is repeating, not one-shot. Do not mark done from implementation alone. There is no `bmad-close-story` skill.

## Story

As a TenantAdmin or TenantMember,
I want Form Studio composition to stay usable at desktop, tablet, and mobile widths,
so that I can add, select, and inspect blocks without losing draft or selection, and without changing form data, schema, field operations, public rendering, or the Epics 35–37 design system.

## User problem and evidence

Three-pane layout starts at Tailwind `xl` (1280). At 1024–1279 the palette, canvas, and inspector stack into a long unguided column. EXPERIENCE 36 asked for three panes at 1024; the product owner chose two-pane plus a collapsible inspector (D7). Below 1024 the inspector is just another stacked card. Evidence: backlog §42.2, PX2-RESP-001, D7, DESIGN.md §14.2, IA §7 D7 planning spec.

## Current Form Studio inventory

See `_bmad-output/planning-artifacts/evidence/px2-42-2/inventory.md`.

Authoritative surfaces (reuse; do not invent):

- Route: `/activities/{id}?tab=form` → `ActivityDetailPageClient` → `ActivityFormTab` → `FormCompositionBuilder`
- Not a primary nav room. Activity tabs: Overview, Design, Form, Registrations, Share kit.
- Form Studio modes: **Build form** / **Preview** (client state, not URL). Design is a separate activity tab.
- Palette: inline aside in `FormCompositionBuilder` + `FormFieldPaletteDialog`
- Canvas: `Form structure` listbox in `FormCompositionBuilder`
- Inspector: `FormCompositionInspector` or `FormFieldEditor` (`inspectorOnly`)
- Templates: `FormTemplatePicker` above the builder
- Grid today: `xl:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,18rem)]` — three panes only at ≥1280; below `xl` all three remain mounted and stack
- No inspector collapse. No Form Studio `Sheet`. No duplicate pane mounts
- Draft owner: `ActivityFormTab.draftSchema`. Selection owner: `FormCompositionBuilder.selectedBlockId`
- Preview: `BuilderSurface keepMounted={false}`. Build stays mounted
- Plan gates stay feature-level inside the existing builder

## Roles, plans, routes, and states

See `px2-42-2/role-plan-state-matrix.md`. Do not change role, plan, activity-status, or operation permissions. Disabled plan-gated controls stay named and explain why they are unavailable.

## Architecture decision

**Wrap the existing `FormCompositionBuilder` in a D7 responsive shell.**

| Viewport | Composition | Inspector |
|---|---|---|
| `≥1280px` | Three CSS grid panes: palette, canvas, inspector | Always visible, not a third cramped column |
| `1024–1279px` | Two persistent panes: **palette + canvas** | Non-modal collapsible overlay. Named toggle. `aria-expanded` / `aria-controls`. Not a Sheet |
| `<1024px` | Stacked palette + canvas | Story 38.6 `Sheet`. Named button. Focus trap, Escape, inert, restore to toggle |

Single canonical editor: one draft, one selected node, one inspector form instance, one palette path, one preview tree. No `key={viewport}`. CSS media queries own visual columns. JavaScript viewport state owns only inspector interaction (collapse vs Sheet).

Rejected alternatives: three cramped panes at 1024; treating Tailwind `lg` as 1280; forking mobile/desktop builders; inspector Sheet at 1024–1279; remounting the editor on resize; Story 42.3 touch-handle work.

## Explicit non-goals

Stories 42.3 and 42.4, Epic 43, composition schema / `fields[]` / renderer / submit payload, Epic 35 shells and conversational flow, plan entitlements, Website Studio, builder motion timings, route-transition architecture, preview unmount contract, demo public themes, canonical fixtures, production claim. Do not add layouts, blocks, fields, templates, or shells.

## Acceptance Criteria

1. `/activities/{id}?tab=form` remains Form Studio. One `main#main-content`. One document `h1` from the activity `PageHeader`. Form builder remains `h2`. Palette and inspector keep accessible names. No second Form Studio route.
2. `≥1280`: three visible usable panes (palette, canvas, inspector). Canvas keeps editing width. Inspector does not overlap the canvas. No document-level horizontal scroll. Existing density and semantic tokens. No extra editor instance.
3. `1024–1279`: exactly two primary panes (palette + canvas) plus a collapsible non-modal inspector. No cramped three-column layout at 1279. Toggle is a semantic button with `aria-expanded` and `aria-controls`. Collapse does not clear selection or unsaved changes. If focus is inside the inspector when collapsed, focus returns to the toggle. Hidden inspector is not keyboard-focusable. No duplicate inspector.
4. `<1024`: stacked workspace. Inspector opens from a named button that includes selected-block context where useful. Sheet uses Story 38.6: accessible name, deliberate initial focus, trap, Escape, inert ownership, restore to the button. Closing does not reset selection. No duplicate form controls behind the Sheet. Background editor cannot be activated while the Sheet is open. Resize to ≥1024 closes or rehomes the Sheet without leftover `inert`, scroll lock, or focus trap.
5. Single-source editor: one composition draft, one selected node, one inspector instance, one palette path, one preview tree. No desktop + Sheet inspectors mounted together. No hidden duplicate IDs. No breakpoint-triggered data reset. No remount caused solely by viewport width. No `key={viewport}`.
6. Live resize continuity (not only separate loads): 1279↔1280, 1023↔1024, 767↔768, Sheet-open → desktop, inspector-focused cross-breakpoint, dirty draft, selected nested block. After every transition: draft and selection survive, no duplicate pane, logical focus, no stale inert or body scroll lock, no overflow, editor operations still work. Resize does not save or refetch.
7. Existing states stay truthful and unchanged in meaning: loading, not found, permission denied, plan-locked (named), Draft / Published / Archived, no selection, selected field/content/section/column, inspector open/collapsed, dirty / saving / save error / saved, Preview. Preview remains unmounted while hidden. Build remains mounted per BuilderSurface.
8. New Story 42.2 controls (inspector toggle, Sheet close, responsive navigation) meet the 44×44 floor. Do not change existing drag-handle sizes (Story 42.3). Light/dark/forced-colors/reduced-motion/200% zoom remain usable. No new serious/critical Axe violations.
9. No backend, schema, public-renderer, entitlement, Website Studio, or Epic 37 timing change. Frontend responsive state does not cache draft data across tenants or activities. No new localStorage key for form contents. No production seeder or reset endpoint.
10. Protected 35–37, 38.3–38.6, 39.4–39.5, 40.5, and 42.1 suites remain intact. Stories 42.3–42.4 and Epic 43 are not started.

## Protected contracts

Epic 35 Form Experience; 36.4 columns; 36.5 tokens; 36.6 preview viewports; 36.7 entitlements; Epic 37 builder motion and AD-8 preview unmount; 38.3 fixture isolation; 38.4 tokens; 38.5 landmarks; 38.6 overlays; 39.4 PageHeader; 39.5 route errors; 40.5 continuity; 42.1 Website Studio.

## Automated and visual QA

Affected + full Vitest, `tsc`, targeted ESLint, Next production build, Story 42.2 Playwright at 390, 430, 767, 768, 1023, 1024, 1279, 1280, 1440, 200% zoom, plus protected regressions listed above. Evidence under `px2-42-2/`.

## Exact stop gate

Story 42.2 `review`. Story 42.1 remains `done`. Epic 42 `in-progress`. 42.3–42.4 not started. Epic 43 not started. One draft PR open and unmerged. Production not claimed.

## Tasks / Subtasks

- [ ] Inventory, readiness, and D7 architecture recorded under `px2-42-2/` (AC: all)
- [ ] Workspace contract module + unit tests for 1023/1024 and 1279/1280 (AC: #2, #3, #4, #5)
- [ ] Three-pane ≥1280 and two-pane + collapsible inspector 1024–1279 (AC: #2, #3)
- [ ] Stacked workspace + 38.6 inspector Sheet below 1024 (AC: #4, #8)
- [ ] Single-source inspector, resize continuity, no save/refetch/remount (AC: #5, #6, #7, #9)
- [ ] Playwright 42.2 + protected 35–37 / 38.3–38.6 / 39.4–39.5 / 40.5 / 42.1 (AC: #8, #10)

## Dev Notes

- Do not treat Tailwind `lg` (1024) as the three-pane threshold. Three panes are `xl` / 1280.
- Persistent two-pane surfaces are palette + canvas. Inspector is the collapsible surface.
- Prefer CSS (`lg:` two columns, `xl:` three columns) for visual composition. Use `useSyncMedia` only for Sheet vs docked inspector interaction.
- Reuse `@/components/ui/sheet`, `useModalInert`, existing semantic tokens, `BuilderSurface`, and current inspector controls.
- Keep `Form builder` as `h2` and `Block properties` as `h3` in the docked inspector (38.5 source contract).
- Selecting a block may open the inspector below 1280. Collapse/close must not clear `selectedBlockId` or `draftSchema`.
- Do not change `touch-none` handle sizing (42.3).
- If an API or schema change appears required, stop and run `bmad-correct-course`.

### Project Structure Notes

- Route stays `web/app/(admin)/activities/[id]/page.tsx`
- Chrome stays in `web/components/activities/form-composition-builder.tsx`
- New contract module: `web/lib/form-studio-workspace.ts`
- Do not fork a mobile builder

### References

- [Source: `_bmad-output/planning-artifacts/cohestra-product-experience-2-backlog.md` §42.2]
- [Source: `docs/DESIGN.md` §14.2]
- [Source: `_bmad-output/planning-artifacts/cohestra-information-architecture.md` §7 D7]
- [Source: `_bmad/custom/mandatory-code-review-loop.md`]

## Dev Agent Record

### Agent Model Used

Grok 4.6 (primary) for catalog, story, readiness, architecture, implementation, tests, and all four review layers. Composer 2.5 unused: no cleanly isolated presentational-only task after the contract was locked.

### Debug Log References

See `_bmad-output/planning-artifacts/evidence/px2-42-2/`.

### Completion Notes List

### File List

### Change Log

- 2026-10-04: Created Story 42.2 from synchronized `main` `eabc03ff`. Epic 42 remains in-progress. 42.1 remains done. 42.3–42.4 not started.
