# Story 42.2 test plan

## Unit

`web/lib/form-studio-workspace.test.ts` — composition at 1023, 1024, 1279, 1280; toggle expanded; docked vs sheet; resize rehome.

`web/lib/landmarks-38-5.test.ts` — keep Form builder `h2`, palette name, Block properties `h3`.

Source contract: no `key={viewport}`; Sheet import; `xl:` three-pane; `lg:` two-pane not three-pane.

## Playwright (`web/e2e/form-studio-42-2.spec.ts`)

Viewports: 390×844, 430×932, 767, 768×1024, 1023×768, 1024×768, 1279×900, 1280×900, 1440×900, 200% zoom.

Assert pane counts, toggle name/`aria-expanded`, Sheet trap/Escape/inert/restore, collapse restore, no duplicate IDs, no hidden focusable inspector, one main / one `h1`, Form builder `h2`, no overflow, selection + dirty draft survive resize, Sheet-open resize releases inert, Preview unmounted, no save/refetch on resize, dark / forced-colors / reduced-motion, Axe serious/critical.

Use owned activity (`provisionOwnedActivity`) with a nested columns schema. Do not mutate canonical demos.

## Protected regressions

Epic 35, 36.4, 36.5, 36.6, 36.7, Epic 37 motion unit, 38.3 isolation, 38.4 tokens, 38.5 landmarks, 38.6 overlays, 39.4 PageHeader, 39.5 route errors, 40.5 continuity, 42.1 Website Studio.

Do not weaken assertions, raise timeouts to hide defects, skip, serialize, or disable `fullyParallel`.
