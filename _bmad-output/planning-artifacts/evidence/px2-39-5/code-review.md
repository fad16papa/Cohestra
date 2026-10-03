# Story 39.5 independent review

Reviewers: Blind Hunter, Edge Case Hunter, Acceptance Auditor.  
Model: Grok 4.6. HEAD: working tree before draft PR.

## Disposition: no unresolved BLOCKER or MAJOR

### Blind Hunter

| Finding | Severity | Disposition |
| --- | --- | --- |
| Root unmatched URLs ignored nested `not-found.tsx` | MAJOR | Fixed. Admin/platform prefix catch-alls call `notFound()`. Root `RootNotFound` also maps pathname → surface. |
| `__e2e__` folder is App Router-private | MAJOR | Fixed. Routes are `/e2e-force-error` and `/dashboard/e2e-force-error`. |
| Module-level throw lost to Strict Mode | MAJOR | Fixed. Explicit “Trigger test error” click; Retry remounts idle harness. |
| Production route table still lists force-error pages | MINOR | Runtime `notFound()` when `NODE_ENV === "production"`. No query/cookie trigger. |

### Edge Case Hunter

| Finding | Severity | Disposition |
| --- | --- | --- |
| Catch-alls omit `/clients/{id}/extra` and similar | MINOR | Root pathname map still recovers to Dashboard. Entity `[id]` pages keep ProductErrorState. |
| Unauthenticated `/platform/*` never paints nested 404 | NIT | Existing `PlatformRouteGuard` → login. Correct, not a 404. |
| Offline uses `navigator.onLine` only | NIT | Matches content-language offline, not a fake 500. |

### Acceptance Auditor

ACs hold: exact h1s; Home / Dashboard / Platform home; one main; h1 focus; 48px public Home; 390/1440; dark/forced-colors captures; no stack/token in DOM; no `loading.tsx`; ProductErrorState and Epic 35 unavailable untouched.

39.4 regression once failed at 43.999px vs 44 on a client-profile control. Classification **D** (subpixel flake). Not introduced by 39.5. Do not weaken the 39.4 assertion.
