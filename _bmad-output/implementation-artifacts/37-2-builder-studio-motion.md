---
status: in-progress
story_key: 37-2-builder-studio-motion
epic: 37
---

# Story 37.2: Builder studio motion coverage

Status: in-progress

## Story

As an operator using Website Build Studio or Form Studio,  
I want dedicated, level-appropriate motion on builder interactions,  
so that the workspace feels continuous without destroying drafts, remounting the canvas on every keystroke, or doing hidden Preview work while I edit.

## Acceptance Criteria

29. **Website Build Studio motion coverage is explicitly verified.** Context enter for Build↔Preview and page/module switches; local tab enter for Design/Sections/Templates; selection/highlight for sections; presence for added sections; dialog/sheet/popover overlay motion with reduced-motion disable; save/publish stay button/status feedback.

30. **Website Build → Preview → Build preserves editor state.** `workspaceMode` / mobile edit|preview stay local React state on `/dashboard/website`. Draft, unsaved dirty flag, expanded section, and editor tab survive. Entering in-studio Preview must not call `saveSiteDraft`.

31. **Website Studio canvas remains responsive during editing.** No scale of the editor canvas on selection. No page-wide movement when editing text. No animation on every keystroke. No animation that changes element measurement during editing.

32. **Website Studio does not introduce unnecessary Preview/render work while editing.** `WebsiteLivePreview` / `SitePageRenderer` stay unmounted in build-only (`shouldShowPreviewPane` false). Split/preview may mount. Returning to Build unmounts preview.

33. **Form Build Studio motion coverage is explicitly verified.** Build↔Preview context enter; field selection; add-field presence; field settings panel; Design local selection; desktop/mobile Preview viewport controls; dialogs; save/unsaved status.

34. **Form Build → Preview → Build preserves unsaved draft state.** `formStudioMode` stays React state in `ActivityFormTab`. Build panel `keepMounted`. Draft schema is not reset on mode change.

35. **Form Preview still uses the latest intended draft data.** Preview reads `draftSchema` + `designDraftTheme` via `buildFormStudioPreviewKey` (debounced). Preview remounts only on material schema/theme change, not on route.

36. **Form Preview submission remains simulated only.** `RegistrationPublicPreviewShell` still uses `PublicRegistrationOpen` `variant="preview"`. No real registration from Preview.

37. **Website and Form Studio desktop/mobile Preview controls remain correct.** Website `deviceMode` phone/desktop; Form/Design `RegistrationPreviewViewportToggle`. Viewport switch does not overflow.

38. **Neither builder introduces noticeable typing/input latency.** No animation wrappers on text inputs. No hidden preview tree doing work on every Build keystroke. `BuilderSurface` must not remount keep-mounted editor children.

39. **Neither builder introduces horizontal overflow through transition transforms.** Builder surfaces use `min-w-0 overflow-x-clip`. Transform/opacity only. No layout-property animation.

40. **Builder-specific live UX acceptance passes.** Representative Website Studio and Form Studio workflows, including 390px supported mobile-browser behavior.

## Motion levels (do not full-page-animate every builder op)

| Interaction | Level |
|-------------|--------|
| Page/module / Build↔Preview | context (`builder-context-enter`, ~180ms opacity+translateY) |
| Builder sidebar tab | tab (`builder-tab-enter`, ~120ms opacity) |
| Section/field selected | selection (`builder-selection`, box-shadow/border/background only) |
| Opening settings / overlays | existing dialog/sheet/popover enter; slightly faster exit already in primitives |
| Adding a section/field | presence (`builder-presence-enter`, ~140ms opacity) |
| Removing | restrained (unmount; no large exit) |
| Reorder | existing drag remains; no extra motion wrapper |
| Save / publish | button/status text; existing dialogs |
| Preview device switch | opacity-only frame enter; do not animate customer site content |

## Non-goals

- New animation libraries / View Transitions API / `dangerouslySetInnerHTML`
- Unifying Website and Form editor internals into one state machine
- Animating the real website or public registration content as builder chrome
- Changing Form Studio save/preview data flow or `buildFormStudioPreviewKey`
- Persisting drafts when entering in-studio Preview
- Keep-mounting live preview during Build

## Tasks / Subtasks

- [x] Task 1 — Shared tokens + primitive (AC: 38, 39)
  - [x] CSS builder enter/selection classes + PRM in `globals.css`
  - [x] `web/lib/builder-motion.ts`
  - [x] `web/components/motion/builder-surface.tsx`
- [x] Task 2 — Form Studio (AC: 33–36, 38)
  - [x] Build keepMounted / Preview unmount
  - [x] Field selection + presence
  - [x] Design preset selection
- [x] Task 3 — Website Studio (AC: 29–32, 37)
  - [x] Editor keepMounted / Preview unmount in build-only
  - [x] Editor tab local enter
  - [x] Section selection + presence
  - [x] Preview device frame opacity enter
- [x] Task 4 — Overlays + reduced motion (AC: 39)
  - [x] Dialog / alert-dialog / sheet / popover PRM
- [x] Task 5 — Tests (AC: 29–39)
  - [x] `web/lib/builder-motion.test.ts` source-read studios
- [ ] Task 6 — Live UX acceptance (AC: 40)

## Dev Notes

### Current state (must preserve)

- Form Studio: `formStudioMode` in `ActivityFormTab`. Build panel `hidden={...}` stay-mounted. Preview `{formStudioMode === "preview" ? ...}` unmounted. `previewKey` debounced 200ms.
- Website Studio: `/dashboard/website` + `workspaceMode` build|split|preview. `shouldShowPreviewPane` already unmounts preview in build-only. Editor currently unmounts in preview — 37.2 keepMounts the editor so scroll/selection local UI is not thrown away. Draft still lives in `WebsiteBuilderPage`.
- Toolbar "Preview" (`handlePreview`) is a **token preview tab** that requires a saved draft. In-studio Preview is `setWorkspaceMode("preview")` and must not save.
- Design tab live preview stays on Design (Epic 25). It uses `activity.formSchema` + design draft theme, not Form Build draft. Do not merge those sources.
- Dialogs already animate via Base UI `data-starting-style` / `data-ending-style`. Add PRM only.

### Architecture (binding)

See `_bmad-output/planning-artifacts/architecture-operator-shell-motion-37-2026-09-21/ARCHITECTURE-SPINE.md` AD-1…AD-8.

### Anti-patterns

- `AdminRouteTransition` inside Form Studio or Website Studio
- `keepMounted` on `WebsiteLivePreview` / `RegistrationPublicPreviewShell`
- `key={formStudioMode}` / `key={workspaceMode}` on draft owners
- Scale/translate on the editing canvas
- Animation class on controlled text inputs
- `startViewTransition` / framer-motion / GSAP
- Saving draft as a side effect of entering in-studio Preview

### Testing

Vitest includes only `web/lib/**/*.test.ts`. Keep tests there. Source-read studio files like `admin-route-motion.test.ts`.

## Dev Agent Record

### Agent Model Used

Grok 4.6 (primary). Composer 2.5 not used.

### Debug Log References

### Completion Notes List

- Shared CSS tokens + `BuilderSurface` (keepMounted editors, unmount live preview).
- Form Studio Build stays mounted; Preview remounts with `draftSchema`.
- Website Studio editor stays mounted across Build↔Preview; `SitePageRenderer` still unmounts in build-only.
- Overlay primitives honor `prefers-reduced-motion`.
- Vitest 361 passed including 13 builder-motion tests.

### File List

- `_bmad-output/planning-artifacts/architecture-operator-shell-motion-37-2026-09-21/ARCHITECTURE-SPINE.md`
- `_bmad-output/planning-artifacts/epics-operator-shell-motion-37.md`
- `_bmad-output/implementation-artifacts/37-2-builder-studio-motion.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `web/lib/builder-motion.ts`
- `web/lib/builder-motion.test.ts`
- `web/components/motion/builder-surface.tsx`
- `web/app/globals.css`
- `web/components/activities/activity-form-tab.tsx`
- `web/components/activities/form-composition-builder.tsx`
- `web/components/activities/activity-design-tab.tsx`
- `web/components/website/website-builder-page.tsx`
- `web/components/website/website-builder-editor-rail.tsx`
- `web/components/website/website-builder-workspace-bar.tsx`
- `web/components/website/website-live-preview.tsx`
- `web/components/website/website-section-fields.tsx`
- `web/components/website/website-add-section-dialog.tsx`
- `web/components/website/website-builder-onboarding-tour.tsx`
- `web/components/registration/registration-preview-viewport-toggle.tsx`
- `web/components/ui/dialog.tsx`
- `web/components/ui/alert-dialog.tsx`
- `web/components/ui/sheet.tsx`
- `web/components/ui/popover.tsx`
- `web/components/ui/toast-provider.tsx`

## Change Log

- 2026-09-21: Story opened — builder studio motion coverage.
- 2026-09-21: Implemented builder tokens, BuilderSurface, studio integrations, overlay PRM.
