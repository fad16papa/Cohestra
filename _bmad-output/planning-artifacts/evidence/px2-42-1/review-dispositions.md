# Story 42.1 four-layer review

Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor, adversarial-general.  
Target: complete Story 42.1 diff vs `main` (`c3e57bbc`).

## Blind Hunter

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| BH-1 | MAJOR (fixed) | Role 403 used to lose HTTP status and could collapse into a generic load error / UpgradePanel path | **Fixed**: `SiteRequestError` + `websiteFetchDenial` |
| BH-2 | MAJOR (fixed) | Unknown/missing plan still fetched `/admin/site` | **Fixed**: fetch only when `access.kind === "open"` |
| BH-3 | MAJOR (fixed) | Tour overlay sat at z-200 above skip link z-80 | **Fixed**: overlay z-60, `aria-modal="false"` |
| BH-4 | MAJOR (fixed) | Tour/checklist keys were global and leaked across tenants | **Fixed**: `:{tenantSlug}` keys; legacy unscoped keys ignored |
| BH-5 | MINOR | Tour overlay still intercepts pointer clicks on an unfocused skip link | Accepted: skip remains first Tab and keyboard-activates `main#main-content` |
| BH-6 | NIT | Component identifiers still say `WebsiteBuilder*` | Accepted: UI chrome is Website Studio; no backend rename |

## Edge Case Hunter

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| EH-1 | MAJOR (fixed) | Revert/publish success was toast-only and failure could leave an inert dialog over the status | **Fixed**: `studioNotice` + close dialogs on failure |
| EH-2 | MAJOR (fixed) | 1024–1279 could look like a cramped three-column if split leaked | **Verified**: split unavailable below 1280; Playwright asserts no Split tab and unmounted preview in Build |
| EH-3 | MINOR | Enterprise and Suspended/OnHold are not dedicated Playwright rows | Accepted: entitlement helper already treats Enterprise as Core+; access/read-only remain existing contracts |
| EH-4 | MINOR | `shouldShowWebsiteBuilderTour(null)` never opens | Accepted: no unscoped persist; conservative |
| EH-5 | NIT | Playwright `skipWebsiteTour` pre-writes tenant keys | Accepted: tour test clears keys and proves skip/tenant scope separately |

## Acceptance Auditor

All Story 42.1 ACs traced:

1. Route `/dashboard/website`, h1 Website Studio, nav/More Website — **pass**
2. Core/Pro editor; Basic admin UpgradePanel no 500; Basic member no checkout; unknown plan pending — **pass**
3. Role 403 ≠ UpgradePanel; `plan_locked` may UpgradePanel — **pass**
4. Distinct states + persistent publish/revert status — **pass**
5. 1280 split optional; 1024–1279 Build/Preview; <1024 Edit/Preview; 390 usable; no overflow; 44×44 — **pass**
6. Hidden preview unmounted; draft continuity; renderer unchanged — **pass**
7. Revert AlertDialog keyboard/focus/failure/success — **pass**
8. Skippable non-modal tour, skip-link, no auto-reopen, tenant scope, no Basic editor tour — **pass**
9. One main, one h1, named preview, axe/dark/forced-colors/reduced-motion/200% — **pass**
10. Core-to-Core isolation test; 42.2–42.4 not started — **pass**

No unresolved BLOCKER or MAJOR.

## Adversarial-general

Sought at least ten issues; none remaining are BLOCKER/MAJOR.

1. Marketing still says “website builder” — out of scope, documented.
2. Command palette label stays Website — required.
3. Split is optional at 1280, not default — matches DESIGN §14.1.
4. Desktop ≥1024 uses Build, not Edit — matches accepted 1024 boundary.
5. Public `/api/v1/public/site` and `SitePageRenderer` untouched — correct.
6. Isolation is host+JWT, not a second site id — website is one-per-tenant.
7. Pre-existing ESLint `set-state-in-effect` on the page/tour — not introduced as new contract; not weakened.
8. Axe runs on the 1440 entitled surface, not every viewport — residual MINOR.
9. Tokens-38-4 visual inventory not re-run this story — semantic tokens unchanged.
10. Composer unused — correct; no bounded-only presentational leftover that required it.

## Repeat rule

If a later patch lands, all four layers must re-run on that exact HEAD.
