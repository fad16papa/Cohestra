# Story 39.5 adversarial review

Model: Grok 4.6 (`bmad-review-adversarial-general`)

## Required probes

| Probe | Result |
| --- | --- |
| Boundary ownership gaps | Root unmatched uses root file; admin/platform prefixes use nested files + catch-alls. Residual extra segments under `[id]` stay entity pages. |
| Infinite retry/reset | Reset remounts idle harness. Throw only on click. |
| Incorrect redirect destinations | Matrix locked in `route-boundary.ts`. |
| Auth failures disguised as 404 | Team/Billing denied copy unchanged. Platform unauth → login. |
| Plan locks disguised as crashes | UpgradePanel / 38.1 / 38.2 untouched. |
| Raw exception disclosure | UI copy only; `console.error` digest only. |
| Production forced-error hooks | `isForceErrorBlocked('production')` → `notFound()`. |
| Nested main / duplicate h1 | Admin/platform/public primitives do not render `main`. Playwright: one h1 / one main. |
| Studio remount / draft loss | No `loading.tsx`. |

## Cynical leftovers (not blockers)

- Force-error URLs exist in the production route manifest and 404 there.
- Platform authenticated 404 needs a platform-admin seed that this environment does not enable.
- Content-language `{tenant}` is “this workspace” — no extra tenant-name API.

No unresolved BLOCKER or MAJOR.
