# Story 39.4 post-merge verification

Date: 2026-10-03  
Implementation HEAD (PO accepted): `d8c6213c05b5032365c017617ba61a1cee11e56e`  
Main merge SHA: `e02f0e2ec60da0e0c5b3ae65f670f12d526dc432` (PR #363)

## Required main CI

Run `37111733890` on `e02f0e2e` — **5/5 success**

- .NET build and test
- API integration tests
- Next.js build
- UAT isolation contract
- Docker stack smoke

GitGuardian is optional on the merge SHA. DigitalOcean Deploy remains classification C (`missing server host`, run `37112001289`) — not a 39.4 defect. Production not claimed.

## Live smoke (`E2E_LIVE_STACK=1`, `PUBLIC_BASE_URL=http://localhost:3000`, `E2E_API_BASE_URL=http://localhost:8080`)

| Check | Result |
| --- | --- |
| `lib/page-header.test.ts` | **3 passed** — PageHeader h1 contract; Dashboard greeting is supporting text; Website title is `Website Studio` |
| `e2e/page-header-39-4.spec.ts` | **1 passed** — heading map; link/button/select ≥44×44; 390/767/768 no overflow; Form Studio one h1 + Form builder h2 + preview no main/h1; Axe contrast enabled |
| `e2e/landmarks-38-5.spec.ts` | **4 passed** — one main / one h1; skip; Website Studio lock h1; Form Studio preview boundary |
| `e2e/a11y-38-4.spec.ts` | **2 passed** |
| `e2e/tokens-38-4.spec.ts` | **6 passed** |
| `e2e/overlays-38-6.spec.ts` | **1 passed** |
| `e2e/desktop-shell-39-1.spec.ts` | **1 passed** |
| `e2e/mobile-nav-39-2.spec.ts` | **1 passed** |
| `e2e/entitlement-visibility-39-3.spec.ts` | **5 passed** |

Total Playwright: **21 passed**. First `/activities` 404 was classification **E** (stale Next after main checkout); resolved by restarting `web-dev-39-4-close`.

## Reconfirmed on merged tree

- Dashboard h1 is exactly `Dashboard`; greeting remains supporting `<p>` text
- Website h1 is exactly `Website Studio`
- Inventoried routes keep one `main` and one `h1`
- Form Studio keeps `Form builder` as `h2`; embedded preview contributes no `main` or `h1`
- Header links, buttons, and selects measure at least 44×44
- No action clipping or page overflow at 390, 767, and 768
- Loading, empty, error, denied, and locked states retain their route h1
- Nav, entitlements, APIs, and Epic 37 motion remain unchanged
- No Story 39.5 or Epic 40 files are present

## Tracker

Story 39.4 → `done`. Epic 39 remains `in-progress`. Story 39.5 not started.
