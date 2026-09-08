# Story: Form Studio Build / Preview Restructure

**Status:** in-progress  
**Foundation:** PR #297 (preview safety — merged)  
**Branch:** `cursor/form-studio-build-preview-a139`

## Pre-implementation architecture report

### 1. Reuse from Design preview
- `PublicRegistrationOpen` with `variant="preview"` — canonical registration UI
- `RegistrationPreviewChrome` — preview mode banner + saved/unsaved status
- Desktop/Mobile viewport toggle pattern from `activity-design-tab.tsx`
- Theme resolution logic (`previewResolved` useMemo) — extract to shared lib

### 2. Extract / share
- `resolveRegistrationPreviewTheme()` + `resolvePersistedRegistrationPreviewTheme()` in `web/lib/registration-preview-theme.ts`
- `RegistrationPublicPreviewShell` — chrome + viewport + `PublicRegistrationOpen`
- `RegistrationPreviewViewportToggle` — segmented Mobile/Desktop control

### 3. Form draft → PublicRegistrationOpen
- Form tab owns `draftSchema` state (unchanged)
- Preview mode passes `draftSchema` as `formSchema` prop
- `previewKey` derived from draft schema remounts renderer on material changes (resets simulated submit)

### 4. Preview-only submission isolation
- Unchanged from PR #297: `PublicRegistrationOpen` + `variant="preview"` → `simulateRegistrationPreviewSubmit`
- No changes to `RegistrationForm` public path or API calls

### 5. Build/Preview tab state ownership
- `formStudioMode: "build" | "preview"` in `ActivityFormTab` (default `"build"`)
- Sub-nav uses same ARIA tab pattern as activity detail tabs
- `hidden` attribute preserves draft state across mode switches (no refetch, no save)

### 6. Obsolete code
- `RegistrationFormPreviewPane` — replaced by `RegistrationPublicPreviewShell`; delete file
- Embedded `<section id="form-live-preview-heading">` at bottom of build form — remove

## Draft vs design state model

| Input | Source |
|-------|--------|
| Form fields, copy, settings | Form tab `draftSchema` (unsaved OK) |
| Hero, theme, branding | Persisted `activity.resolvedRegistrationTheme` + `activity.registrationTheme` |
| Design tab draft theme | NOT shared with Form preview (by design) |

## Definition of done

- [x] Form sub-tabs: Build form | Preview
- [x] Build: editor only, no bottom embedded preview, compact copy controls
- [x] Preview: full public renderer, hero, theme, Desktop/Mobile, safety chrome, simulated submit
- [x] Design preview still works via shared shell
- [x] Tests green, browser validation complete
