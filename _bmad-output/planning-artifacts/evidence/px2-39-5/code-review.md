# Story 39.5 independent review

Reviewers: Blind Hunter, Edge Case Hunter, Acceptance Auditor.  
Model: Grok 4.6. HEAD: Story 39.5 PO-correction commit on `cursor/story-39-5-route-errors-0fcb` (see final report).

## Disposition: no unresolved BLOCKER or MAJOR

PO MAJORs from PR #365 review are **fixed** on this HEAD.

### Blind Hunter

| Finding | Severity | Disposition |
| --- | --- | --- |
| Incomplete admin 404 ownership (Clients/Activities/Campaigns/Billing/Reports/Intelligence/Needs Attention) | MAJOR (PO) | Fixed. Targeted `[...unmatched]` (and `[id]/[...unmatched]`) now exist under every `ADMIN_PATH_PREFIXES` family. Production route table keeps `[id]`, `/billing/checkout`, and `/billing/paddle-return`. |
| Offline copy promised auto-retry but never called `reset()` | MAJOR (PO) | Fixed. `shouldAutoResetOnReconnect` + `RouteErrorScreen` call `reset()` once on the first offline→online transition. |
| Root unmatched URLs ignored nested `not-found.tsx` | MAJOR | Fixed earlier. Prefix catch-alls + `RootNotFound` pathname map remain. |
| `__e2e__` folder is App Router-private | MAJOR | Fixed earlier. Routes are `/e2e-force-error` and `/dashboard/e2e-force-error`. |
| Module-level throw lost to Strict Mode | MAJOR | Fixed earlier. Click-to-throw; Retry remounts idle harness. |
| Production route table still lists force-error pages | MINOR | Runtime `notFound()` when `NODE_ENV === "production"`. |
| Admin top-bar breadcrumb on `/clients/{id}/extra` still says Profile | NIT | Path-derived chrome. Document h1 remains `Page not found` inside `main#main-content`. |

### Edge Case Hunter

| Finding | Severity | Disposition |
| --- | --- | --- |
| `reset` identity changes re-running the effect | NIT | `hasAutoReset` ref prevents a second auto-reset on the same mount. |
| Strict Mode remount resets refs | NIT | Remount starts online or offline without calling `reset()` until a later offline→online transition. |
| Catch-alls omit nothing in `ADMIN_PATH_PREFIXES` | — | Vitest walks each prefix folder for `[...unmatched]/page.tsx`. Entity `[id]` pages still exist. |
| Unauthenticated `/platform/*` never paints nested 404 | NIT | Existing `PlatformRouteGuard` → login. Correct. |
| 39.4 WhatsApp 43.999px vs 44 | D | Subpixel flake. Not introduced by 39.5. Assertion not weakened. |

### Acceptance Auditor

ACs hold after PO correction:

- AC2: representative `/clients/{id}/extra`, `/activities/{id}/extra`, `/campaigns/{id}/extra`, `/billing/checkout/extra`, `/reports/extra` render Workspace complementary + `main#main-content` + one h1 `Page not found` + Dashboard `/dashboard`.
- AC5: `setOffline(false)` recovers the force-error idle trigger without clicking Try again. Manual Try again remains while offline.
- Exact h1s; one main; h1 focus; 48px public Home; 390/1440; dark/forced-colors; no stack/token in DOM; no `loading.tsx`; ProductErrorState / Epic 35 / 38.1 / 38.2 UpgradePanel untouched.

38.2 Playwright direct `request.get` 404s when `PUBLIC_BASE_URL` is used as `API_BASE`. Classification **E** (harness host). Re-run with `E2E_API_BASE_URL=http://localhost:8080` passed; editor and Basic UpgradePanel still render.
