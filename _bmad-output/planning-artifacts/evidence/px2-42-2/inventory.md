# Form Studio inventory (Story 42.2)

Baseline: `eabc03fffee324e0ad90d07007a8dcfe8e812378`. Product code not edited for this inventory.

## Routes

| Surface | Path / owner |
|---|---|
| Activity detail | `/activities/[id]` → `web/app/(admin)/activities/[id]/page.tsx` → `ActivityDetailPageClient` |
| Form Studio | `?tab=form` on the activity detail. Default tab is `overview` |
| Form tab UI | `web/components/activities/activity-form-tab.tsx` (`ActivityFormTab`) |
| Builder | `web/components/activities/form-composition-builder.tsx` |
| Design | Separate activity tab `?tab=design` (`ActivityDesignTab`). Not a Form Studio mode |

Form Studio Build/Preview is client state (`formStudioMode`), not a URL. Tab ids: `#form-studio-tab-build`, `#form-studio-tab-preview`.

## Access

Authenticated tenant operator via `AdminRouteGuard`. Platform admins redirect to `/platform`. Activity load is `fetchActivityById`. No extra Form-tab role gate beyond API success. Plan gates are feature-level inside the builder (columns, domain, steps, templates).

## Current panes

| Pane | Component | Notes |
|---|---|---|
| Palette | Inline `<aside aria-labelledby="form-block-palette-heading">` | Plus `FormFieldPaletteDialog` |
| Canvas | `<section aria-label="Form structure">` | listbox of blocks |
| Inspector | `<section>` “Block properties” | `FormFieldEditor` inspectorOnly or `FormCompositionInspector` |
| Templates | `FormTemplatePicker` | Above the builder; hidden when archived |

## Grid and breakpoints

Quoted class in `form-composition-builder.tsx`:

```
grid min-w-0 gap-4 xl:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,18rem)]
```

Tailwind v4 defaults: `lg` = 1024, `xl` = 1280. `lg:` is used only for panel `min-h`. Below `xl` the three panes stay mounted and stack. No collapse. No Sheet.

## Duplication

No breakpoint-duplicated palette, canvas, or inspector. One mount each. Field-ref inspector adds an inner “Field properties” card (nested chrome, not a second editor). `FormFieldEditor` full two-column layout is unused by the Form tab.

## State ownership

| Concern | Owner |
|---|---|
| Selected composition node | `FormCompositionBuilder.selectedBlockId` |
| Inspector open/collapsed | **None today** |
| Unsaved draft | `ActivityFormTab.draftSchema` / `isDirty` |
| Build/Preview | `ActivityFormTab.formStudioMode` |
| Viewport composition | CSS `xl:` only |
| Activity tab | `ActivityDetailPageClient` + URL `tab` |

No undo stack. Reorder is arrows + HTML5 drag. Preview unmounts (`keepMounted={false}`). Build stays mounted.

## Overlays

Form Studio uses AlertDialog/Dialog for templates. Palette browse is a custom dialog (38.6 exception). **No Sheet** under `web/components/activities/`. Shared Sheet: `web/components/ui/sheet.tsx` + `useModalInert`.

## Activity status

Draft: full edit. Published: edit + save; templates locked. Archived: builder `disabled`, templates hidden, save bar hidden.

## Tests to protect

See `px2-42-2/test-plan.md`. Key existing files: `form-experience-epic-35.spec.ts`, `form-studio-columns-36-4.spec.ts`, `form-studio-design-36-5*.spec.ts`, `form-studio-preview-36-6.spec.ts`, `form-studio-domain-36-7.spec.ts`, `landmarks-38-5`, `overlays-38-6`, `page-header-39-4`, `continuity-40-5`, `website-studio-42-1.spec.ts`.
