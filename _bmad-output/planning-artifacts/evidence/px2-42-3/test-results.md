# Story 42.3 test results

Agent: Grok 4.6. Local stack: API `:8080`, web `:3000`, `E2E_LIVE_STACK=1`.

## Frontend

| Gate | Result |
|---|---|
| Affected Vitest (pointer, handle, equivalence) | 9 passed |
| Full Vitest | **105 files / 657 passed** |
| `npx tsc --noEmit` | pass |
| Targeted ESLint | 0 errors; 3 pre-existing unused-var warnings |
| `NEXT_PUBLIC_API_URL=http://localhost:8080 npm run build` | pass (Next 16.3.6) |

## Story 42.3 Playwright

`e2e/form-studio-42-3.spec.ts`: **7 passed** (10.0s)

- handles measure 44px across D7 compositions
- mouse (HTML5 DragEvent on the mouse path) and keyboard reorder keep focus/selection
- touch/pointer reorder (`pointerType: "touch"`) at 390
- tap, Escape-cancel, and row-body scroll do not reorder or save
- inspector Sheet, resize, Save form, reload
- dark / forced colors / reduced motion / 200% zoom / axe
- Basic reorder + Core columns + archived disabled

`e2e/website-studio-42-3.spec.ts`: **1 passed**

- Website section handle ≥44×44, keyboard ArrowUp/Down, touch pointer, save/reload, 42.1 Build preview unmount, restore original section order

## Protected regressions

| Suite | Result |
|---|---|
| 36.4 columns | passed |
| 36.5 design + checkpoint | passed |
| 36.6 preview | passed |
| 36.7 entitlements/domain | passed |
| Epic 37 builder-motion Vitest | 13 passed (in full Vitest) |
| 38.3 isolation | passed |
| 38.4 tokens + a11y-38-4 | passed |
| 38.5 landmarks | passed |
| 38.6 overlays | passed |
| 40.5 continuity | passed |
| 42.1 Website Studio | passed |
| 42.2 Form Studio D7 | passed |
| 39.4 page-header | **1 failed** — `client-profile 768 clipped` |

36.2 has no dedicated e2e file; field/section operations remain covered by `form-composition-mutations` / `form-composition-content` / 36.4.

## Unrelated 39.4

`page-header-39-4.spec.ts` failed at `assertHeaderActionsStayInViewport` for **client-profile 768**. This story does not change PageHeader or the client profile room. Assertion was not weakened. Classified unrelated under the Mandatory Code Review Loop.
