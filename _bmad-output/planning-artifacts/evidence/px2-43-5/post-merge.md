# Story 43.5 post-merge verification

Date: 2026-10-08  
Accepted HEAD: `ee4d780dd5d31056d58b28aabc7fb9949d1191dd`  
Implementation merge SHA: `e18f5d937064cdc7d9390eae940efc80ed42c3d5` (PR #401)

## Required CI

- PR CI [`37762088212`](https://github.com/fad16papa/Cohestra/actions/runs/37762088212) on `ee4d780d` — success (.NET, Next.js, API integration, Docker smoke, UAT isolation, GitGuardian)
- Main CI [`37762927544`](https://github.com/fad16papa/Cohestra/actions/runs/37762927544) on `e18f5d93` — **failed** Docker smoke: `marketing home loads` timed out waiting for `load` (30s × 3). All 43.5 cookie tests passed; `/pricing` then passed in 567ms.
- Unblocker on this tracker-close: smoke waits for `domcontentloaded` and asserts H1 + Start free; cookie `ResizeObserver` publishes `--marketing-cookie-banner-height` only when the rounded height changes. Epic 43 stays held until this PR merges and post-merge main CI is green.

Deploy-to-droplet remains a pre-existing Epic 19 failure on main and is not a 43.5 required gate.

## Isolation

- No new epic started
- No cookie-law interpretation invented
- No production fixture/seeder
- Epic 35–37 untouched
