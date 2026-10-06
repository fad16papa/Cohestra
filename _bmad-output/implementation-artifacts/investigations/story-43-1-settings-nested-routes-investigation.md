# Investigation: Story 43.1 Settings nested routes

## Hand-off Brief

1. **What happened.** Original 43.1 predates 38.5, 39.1, and 39.4. Current main (`10c68679`) already has one admin `<main>`, Team/Billing as real routes, `/settings` → `/settings/profile` (search preserved), and 39.5 unmatched not-found. Remaining Settings areas still live behind in-memory `activeId` on one client page. `?section=` is not consumed.
2. **Where the case stands.** Concluded. Remaining work is route identity for existing sections, Link navigation, legacy redirects, and heading ownership per nested path. Do not reopen landmarks, Team redesign, Billing/Paddle, or custom-domain product.
3. **What's needed next.** Party/spec/UX/architecture from remaining MUST items only. Pathname becomes canonical section identity.

## Case Info

| Field | Value |
| ----- | ----- |
| Ticket | Story 43.1 — Settings nested routes |
| Date opened | 2026-10-06 |
| Status | Concluded |
| System | Cohestra HEAD `10c686791b5587a7eda8b9a21c96465f0366c065` (`origin/main`) |
| Evidence sources | Source, unit tests, e2e, original backlog §43.1, DESIGN.md D17, 38.5/39.1/39.4 |

## Problem Statement

Settings must become a collection of addressable application pages without changing permissions, entitlements, Team, Billing, branding, appearance, or other Settings business logic. Original 43.1 concerns are hypotheses — classify against current HEAD, then implement only what is still missing.

## Evidence Inventory

| Source | Status | Notes |
| ------ | ------ | ------ |
| Settings route tree | Available | `profile`, `team`, `billing`, `[...unmatched]`; no `settings/layout.tsx` |
| `/settings` index | Available | Server redirect to `/settings/profile` + search |
| In-page sections | Available | `activeId` on `SettingsPageContent`; default Admin `settings-plan`, Member `settings-account` |
| `?section=` consumption | Missing | Preserved on redirect; not read |
| Left rail | Available | `hidden lg:flex`; **buttons** for sections; Team/Billing **Links** |
| Right rail | Available | `hidden xl:flex` |
| Mobile tabs | Available | `lg:hidden` buttons + Context sheet |
| Nested `<main>` | Satisfied | 38.5; center is `<section>` |
| Dual h1 | Partial | Profile h1 always "Settings" + panel h2; Team/Billing own h1 |
| Member Team | Available | `router.replace("/settings")` + “admins only” copy; not ProductErrorState |
| Member Billing | Available | Stay on `/settings/billing` with denied copy |
| Domain | Available | Waitlist UI; Enterprise-admin visibility only |
| Appearance | Available | `usePersistedThemePreference`; public `forcedTheme` untouched |
| Document titles | Missing | Root metadata is `Cohestra` only |
| 39.5 unmatched | Available | `/settings/teem` → `InvokeNotFound` |

## Delta audit (original 43.1 concerns)

| Original concern | Classification | Evidence |
| ---------------- | -------------- | -------- |
| Nested `<main>` | **ALREADY SATISFIED** | `dashboard-layout.tsx` one `main#main-content`; settings uses `<section>`; `landmarks-38-5.test.ts` |
| Dual headings (Settings + Team/Billing) | **ALREADY SATISFIED** for Team/Billing pages; **STILL MISSING** on profile mega-page (h1 Settings + h2 section) | `settings-page-header.tsx`; `settings-section-panel.tsx` h2 |
| Rails vanish lg–xl (PX2-RESP-004) | **OBSOLETE / SUPERSEDED** | Left from `lg` (1024); right from `xl` (1280). 1024–1279 is two-pane, not a hole. `<lg` uses chips + Context sheet |
| Member vs Admin section differences | **ALREADY SATISFIED** (visibility) | `adminOnly` filter; domain Enterprise gate |
| Route-level section identity | **STILL MISSING** for plan/brand/organization/notifications/embed/domain/account/support/appearance | `useState(activeId)` |
| Query-string as IA | **PARTIALLY SATISFIED** | `/settings?section=` survives redirect; not applied |
| Responsive navigation | **PARTIALLY SATISFIED** | Pattern exists; section controls are buttons, so history/reload cannot restore section |
| One h1 per nested route (section name) | **STILL MISSING** except Team/Billing | Profile title is always "Settings" |
| Compatibility redirects | **STILL MISSING** | `?section=team` does not become `/settings/team` |
| Permissions/entitlements unchanged | **ALREADY SATISFIED** | Do not touch server auth, UpgradePanel, Paddle, Team internals |

Do not re-fix 38.5 landmarks or 39.4 global header hierarchy.

## Confirmed Findings

### Finding 1: Partial nested routes already exist

**Evidence:** `web/app/(admin)/settings/page.tsx:13`; `profile/page.tsx`; `team/page.tsx`; `billing/page.tsx`; `[...unmatched]/page.tsx`

`/settings` always redirects to `/settings/profile` with no role check. `/settings/profile` is the mega-page, not “Your account”.

### Finding 2: Canonical in-page default disagrees with the URL default

**Evidence:** `settings-sections.ts:112-114`; `settings-page-content.tsx:95-97`

Admin first panel is Plan & limits. Member first panel is Your account. After nested routes, keeping `/settings` → `/settings/profile` would change Admin first-view from Plan to Account.

### Finding 3: `?section=` is dead as navigation

**Evidence:** `settings-page-content.tsx` has no `useSearchParams`; `desktop-shell-39-1.spec.ts:150-154` asserts `/settings/profile?section=account` (query kept, section ignored).

### Finding 4: Pathname is not section identity

**Evidence:** `activeId` local state; left rail `NavButton` `onClick` → `setActiveId`; reload of `/settings/profile` always returns Admin to Plan.

### Finding 5: Member Team vs Billing already differ — preserve both

**Evidence:** Team `settings-team-page-content.tsx:67-71,105-113` replace `/settings`. Billing `settings-billing-page-content.tsx:29-37` stay + deny. Neither uses `ProductErrorState`.

### Finding 6: Footer Settings highlight already treats non-team/billing `/settings/*` as Settings

**Evidence:** `isSettingsProfilePath` (`admin-canonical-routes.ts:81-86`). `/settings/plan` would already highlight the Settings footer item once the route exists.

### Finding 7: Custom domain is a waitlist, not a product

**Evidence:** `custom-domain-section.tsx`; `isCustomDomainSettingsVisible` Enterprise admin only.

### Finding 8: Internal `/settings?section=` production callers do not exist

**Evidence:** Grep. Production Team/Billing links already use nested paths. Member Team uses `router.replace("/settings")`. Footer/user-menu use `/settings/profile`.

### Finding 9: 38.5/39.4 heading/landmark contracts must not be reopened

**Evidence:** `page-header-39-4.spec.ts` `/settings/profile` h1 Settings; `landmarks-38-5.spec.ts` `/settings` h1 Settings. Nested-route h1 = section label is an in-scope 43.1 change to those assertions, not a 38.5/39.4 rebuild.

## Deduced Conclusions

- Route list is derived from `settingsSections` + existing Team + Billing. Do not invent extra areas.
- `/settings/profile` maps to `settings-account` (Your account).
- Admin `/settings` must go to `/settings/plan` to preserve current first-view.
- Member `/settings` must go to `/settings/profile`.
- Admin-only nested URLs for Members follow Team (message + replace to first allowed), not 404.
- Billing keeps stay-and-deny.
- Entitlement-hidden `/settings/domain` follows 39.5 not-found (not silent Profile).
- Unknown `/settings/teem` stays unmatched 39.5.
- Nav must become Links. Pathname is the only section authority.
- Shared App Router layout under `settings/(workspace)/` so unmatched does not inherit Settings rails.

## Hypotheses

| ID | Hypothesis | Status |
| -- | ---------- | ------ |
| H1 | Original nested-main / dual-h1 defects still exist on Settings | **Refuted** (38.5/39.4) except profile h1+h2 pair |
| H2 | Rails vanish between lg and xl | **Refuted** — two-pane at 1024–1279 |
| H3 | `?section=` currently selects a panel | **Refuted** |
| H4 | Shipping `/settings/domain` would ship custom domains | **Refuted** if waitlist + visibility preserved |

## Reproduction / verification plan

1. Direct `/settings/team` reload stays Team.
2. `/settings?section=billing` replace-navigates to `/settings/billing`.
3. Admin `/settings` → `/settings/plan`.
4. Member `/settings/team` still “admins only” then first allowed personal route.
5. `/settings/teem` 39.5 not-found.
6. Back: Profile → Team → Billing → Back is Team then Profile.
7. 1440 three-pane; 1024 two-pane; 768/390 chips + Context; no horizontal overflow.

## Final Conclusion

**Confidence: High.** Story 43.1 is a brownfield IA/routing delta. Landmarks and Team/Billing pages already exist. Remaining gap is converting the mega-page `activeId` switcher into nested App Router paths with Link navigation and legacy redirects, without business-logic drift.

## Next

`bmad-party-mode` (John/Sally/Winston) → spec → UX → architecture → create-story.
