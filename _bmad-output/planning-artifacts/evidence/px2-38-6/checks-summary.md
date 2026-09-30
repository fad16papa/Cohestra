# Story 38.6 checks summary

Date: 2026-09-30  
HEAD at evidence capture: `cursor/story-38-6-overlays-0fcb` (see git log)

## Automated

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | pass |
| Targeted ESLint on changed frontend files (`--max-warnings=0`) | pass |
| Vitest `lib/overlays-38-6.test.ts` | 5 passed |
| Vitest `lib/use-modal-inert.test.ts` | 2 passed |
| Vitest `lib/overlay-tab-trap.test.ts` | 1 passed |
| Vitest `lib/motion-polish.test.ts` | 9 passed |
| Vitest `lib/landmarks-38-5.test.ts` | 6 passed |
| Full Vitest (`npx vitest run`) | **76 files, 484 passed** (plus new overlay tests in later HEAD) |
| Playwright `e2e/overlays-38-6.spec.ts` (`E2E_LIVE_STACK=1`) | **1 passed (14.2s)** after review patches |
| Playwright `e2e/landmarks-38-5.spec.ts` | **4 passed** |
| Playwright `e2e/tokens-38-4.spec.ts` | **6 passed** |
| Playwright `e2e/a11y-38-4.spec.ts` | **2 passed** |

## Live overlay contract

See `interaction-matrix.json`, `keyboard-sequences.json`, `axe-results.json`, and `viewports/`.

Axe rules checked on open overlays: `aria-dialog-name`, `aria-modal-attr`, `aria-hidden-focus`, `bypass`, `duplicate-id`, `duplicate-id-aria`, `focus-order-semantics`, `landmark-one-main`, `page-has-heading-one`. All empty.

## Viewports

- Desktop: 1440×900, 1024×768
- Mobile: 390×844, 430×932
- Dark: `palette-dark-1440x900.png`
- Forced-colors: `palette-forced-colors-1440x900.png`
- Nested/exclusive sibling: `nested-sheet-then-palette-exclusive-390x844.png`

## Production build

Recorded in the follow-up commit / PR checks.

## Not run / unchanged

- DigitalOcean production deploy: classification C, SSH inputs missing
- Epic 39+ stories
