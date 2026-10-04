# Story 42.2 test results

HEAD after implementation + review patches (see git). Composer unused.

## Frontend

| Gate | Command | Result |
|---|---|---|
| Affected Vitest | `npx vitest run lib/form-studio-workspace.test.ts lib/landmarks-38-5.test.ts lib/form-composition-builder-flow.test.ts lib/builder-motion.test.ts` | **31 passed** |
| Full Vitest | `npx vitest run` | **648 passed / 101 files** |
| tsc | `npx tsc --noEmit` | **pass** |
| Targeted ESLint | builder + workspace + 42.2 spec | **0 errors** (pre-existing unused `duplicateFieldIds` warning) |
| Next production build | `npm run build` | **pass** |

## Story 42.2 Playwright

`E2E_LIVE_STACK=1 PUBLIC_BASE_URL=http://localhost:3000 npx playwright test e2e/form-studio-42-2.spec.ts`

**1 passed** (11.9s) after review-patch retests. Covers 390–1440, 1023/1024, 1279/1280, Sheet, inert, dirty draft, nested selection, no save/refetch, dark / forced-colors / reduced-motion / 200% zoom, Axe serious/critical at 1440.

## Protected regressions

| Suite | Result | Notes |
|---|---|---|
| Epic 35 | pass | |
| 36.4 columns | pass | |
| 36.5 + checkpoint | pass | |
| 36.6 preview | pass | |
| 36.7 domain | pass | |
| 38.4 tokens | pass | |
| 38.5 landmarks | pass | includes Form Studio preview |
| 38.6 overlays | pass | |
| 39.4 PageHeader | **fail** client-profile 768 clipped | Unrelated to Form Studio. Long email h1. Retry still failed. Classification **unrelated**. Assertion not weakened. Form Studio h2 covered by 38.5 + 42.2 |
| 39.5 route errors | pass | |
| 40.4 activities | first run 43.999px status filter; retry **pass** | Classification **D** subpixel. Assertion not weakened |
| 40.5 continuity | pass | |
| 42.1 Website Studio | pass | |

No assertions weakened. `fullyParallel` unchanged.
