# Story 42.2 post-merge verification

Date: 2026-10-04  
Accepted implementation commit: `c382949388508b639730cd37517157d2056e673d`  
Implementation merge SHA: `251b402f9da07c221a680afa7b19b94f4ca74c69` (PR #385)  
PR HEAD at merge: `c382949388508b639730cd37517157d2056e673d`  
`c3829493` is an ancestor of `251b402f`.  
Merge parents: `eabc03fffee324e0ad90d07007a8dcfe8e812378` + `c382949388508b639730cd37517157d2056e673d`.

## Required main CI

Run [`37217189796`](https://github.com/fad16papa/Cohestra/actions/runs/37217189796) on `251b402f` — **5/5 success**

- UAT isolation contract
- API integration tests
- Next.js build
- .NET build and test
- Docker stack smoke

PR CI on #385 is not the close signal. Final-head PR CI was [`37215638135`](https://github.com/fad16papa/Cohestra/actions/runs/37215638135) on `c3829493` (5/5 required + GitGuardian) before merge. Superseded commit `ee1ecb44` was not used.

Production remains unclaimed. DigitalOcean deploy credentials are unavailable. Infrastructure and credentials were not modified.

## Product-owner final-head review on `c3829493`

Four independent layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor, adversarial-general) plus a live type-without-blur resize probe. Zero unresolved BLOCKER/MAJOR.

Inspector instance: docked `<section>` is stable across 1279↔1280 (CSS overlay vs third column). Crossing 1024 remounts the inspector host (`docked` ↔ Story 38.6 `Sheet`) as specified in `architecture.md`. Authoritative state:

| Concern | Owner |
|---|---|
| Draft / typed field values / dirty | `ActivityFormTab.draftSchema` (controlled inputs) |
| Selected node | `FormCompositionBuilder.selectedBlockId` |
| Two-pane open | `FormCompositionBuilder.inspectorOpen` |
| Sheet open | `FormCompositionBuilder.sheetOpen` |

## Focused post-merge tests on synchronized `main` `251b402f`

Env: `E2E_LIVE_STACK=1 PUBLIC_BASE_URL=http://localhost:3000 E2E_API_BASE_URL=http://localhost:8080`

| Gate | Result |
| --- | --- |
| Vitest workspace + builder-motion + composition-builder-flow | **25 passed** |
| `e2e/form-studio-42-2.spec.ts` | **1 passed** — breakpoints, Sheet, inert, no save/refetch, a11y |
| Independent type-without-blur probe | **1 passed** — `"Postmerge kept"` survived 1440→1279→1280→1024→1023→1024 and 390 Sheet → 1440; no Preview; no form-schema PUT; inert/scroll lock released |
| Epic 35 public + unsaved preview | **passed** |
| Stories 36.4–36.7 | **passed** |
| Story 38.6 overlays | **1 passed** |
| Story 42.1 Website Studio | **10 passed** |

Combined focused Playwright: **59 passed / 0 failed** including the temporary probe (not committed). Earlier-story screenshots were not committed.

## Tracker

- `42-1-website-studio-chrome-and-placement: done`
- `42-2-form-studio-responsive-composition: done`
- `epic-42: in-progress`
- Stories 42.3 and 42.4 were not created and are not started
- Epic 43 was not created and is not started
- Production not claimed

## Deferred residuals

From four-layer review on `c3829493` — no unresolved BLOCKER or MAJOR:

- After some remounts, focus lands on the inspector toggle or `document.body` instead of the edited Label — **MINOR / defer**
- Stacked Sheet initial focus is the first sheet control (column move), not `initialFocus` on the field — **MINOR / defer**
- Official e2e uses `fill()`; type-without-blur was proven independently — **NIT / defer**
- Axe serious/critical subset asserted at 1440 only — **NIT / defer** (same pattern as Story 42.1)
- 200% evidence uses CSS `zoom`, not browser zoom — **NIT / defer** (same as 42.1)
- `inspectorOpenRef` / `sheetOpenRef` sync in `useEffect` while resize rehomes in `useLayoutEffect` — **NIT / defer** (not reproduced)
- 39.4 client-profile 768 clip — **unrelated / defer** (assertion not weakened)

## Composer 2.5

Not used. Grok 4.6 owned FINAL HEAD REVIEW, corrections, tests, merge, post-merge verification, required main CI, tracker close, and reporting.
