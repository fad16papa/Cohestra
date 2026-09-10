# SPEC: Website Builder Studio Revamp

## MUST

- Preserve all existing Website Builder capabilities (draft, autosave, save, publish, revert, templates, presets, sections CRUD, visibility, plan gates, checklist, tour, share preview, fullscreen, phone/desktop preview).
- Bounded preview viewport: website scrolls inside preview; outer builder page height stable.
- Build / Split / Preview workspace modes on desktop; Edit / Preview on mobile.
- Default Build on viewports <1536px; default Split on ≥1536px when split available.
- Split only when viewport ≥1280px.
- Section selection scrolls preview to matching section anchor.
- Publish remains primary action; readiness compact when ready, expanded when blocked.

## MUST NOT

- Remove or regress existing builder features.
- Mix Marketing Cinema or Epic 19 deployment work.
- Force permanent side-by-side split at lg (1024px) when panes would be cramped.
- Expand outer page to full rendered website height.

## SHOULD

- Consolidated preview toolbar (device + fullscreen).
- "+ Add section" dialog with Core / Studio groupings.
- Editor column max ~440px in split mode.

## MAY

- Persist workspace mode preference in localStorage (deferred).
