# Investigation: Website Builder Studio Revamp

## Functionality inventory (preserved)

Draft editing, autosave, explicit save, publish, revert, publish readiness gates, setup checklist, Design/Sections/Templates tabs, built-in presets, saved templates, section add/remove/reorder/visibility, public rendering, live preview, phone/desktop/fullscreen, share preview, Open live, copy link, branding, upcoming activities, plan gates, unsaved guard, onboarding tour.

## Architecture findings

- `website-builder-page.tsx` used permanent `lg:grid-cols-[0.92fr_1.08fr]` split at 1024px.
- `website-live-preview.tsx` projected full scaled canvas height via `scaledCanvasHeight`, expanding outer page when preview was sticky beside editor.
- State already had `deviceMode`, `mobileWorkspace`, `editorTab`, autosave hook.

## Primary pain point (confirmed)

Full website height determined builder page height; preview scaled narrow; editor ended while preview continued below.

## Redesign (selected)

Build / Split / Preview workspace modes with width-based thresholds (split ≥1280px, default split ≥1536px). Bounded studio shell via `useWebsiteStudioHeight`. Preview scrolls inside viewport. Compact publish readiness in toolbar.

## Section anchors

`data-site-preview-section-id` on `SitePageRenderer` section wrappers; `WebsiteLivePreview.scrollToSection()` on editor selection.
