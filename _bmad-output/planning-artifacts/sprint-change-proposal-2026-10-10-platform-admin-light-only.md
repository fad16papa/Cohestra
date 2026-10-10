# Sprint Change Proposal — PlatformAdmin-only light lock

Date: 2026-10-10
Workflow: bmad-correct-course
Mode: Batch (owner-authorized)
Model: Cursor Grok 4.6
PR: #431
Branch: `cursor/light-only-appearance-59c2`
Supersedes: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-10-light-only.md`

## 1. Issue Summary

Previous correction: **global Cohestra light-only**.

Superseded by: **PlatformAdmin-only light lock**.

The existing global theme architecture remains a supported Cohestra capability outside PlatformAdmin.

HEAD `d1540d1e699e5662abb09c0e9c981ecb88bb0f47` removed ThemeProvider, ThemeToggle, Settings → Appearance, next-themes, public theme storage, and `.dark` tokens across tenant/admin/public/registration/website surfaces. Owner: that implementation is too broad. Do not merge it.

## 2. Impact Analysis

### Epic impact

Epic 44 Platform production support is unchanged in business logic. Appearance is a surface contract: PlatformAdmin operational console is light-only. Tenant operator UX is not part of that lock.

### Story impact

No new story. Correct PR #431 on the same branch. Story 44.9 / PR #430 stays frozen at `31da0413491080f13251165f939bee961d2e2f5a`.

### Artifact conflicts

| Artifact | Action |
| -------- | ------ |
| SPEC / EXPERIENCE light-only | Rewrite to PlatformAdmin exception |
| Prior global sprint-change proposal | Historical; superseded by this document |
| web README / architecture theme note | State tenant themes + Platform exception |
| User manual Appearance | Keep (tenant/admin) |
| Global light-only tests | Replace with A–L + route-transition |

### Technical impact

Restore theme modules from `origin/main`. Add `isPlatformLightOnlyPath`. Force light via ThemeScript + `forcedTheme="light"`. Do not write `themePreference`, `cohestra-theme-operator`, or public session keys when entering Platform.

## 3. Recommended Approach

**Direct adjustment** on PR #431. Minor scope. Developer implements on the current correction branch.

Rationale: the theme tree already supports `forcedTheme` and first-paint ThemeScript. A second provider or global deletion is unnecessary.

Risk: first-paint dark flash if ThemeScript does not branch before storage/OS; preference mutation if ThemePreferenceSync calls `setTheme` on Platform.

## 4. Change Proposals

### Story / product contract

OLD (global):

- Application mode is always light.
- No ThemeToggle, no Settings → Appearance.

NEW:

- Tenant/operator/public/registration/website: Light / Dark / System remain.
- PlatformAdmin `/platform` and `/platform/**` (including `/platform/login`): always light, no selector, no first-paint dark flash.
- Platform light is a route override, not a saved preference.

### Architecture

OLD: delete next-themes.

NEW: keep next-themes. `ThemeProvider` uses `forcedTheme="light"` when `isPlatformLightOnlyPath(pathname)`. ThemeScript applies light on Platform before reading storage or `prefers-color-scheme`.

### UI / UX

- Restore Settings → Appearance (Light / Dark / System + profile persistence).
- Restore admin top-bar ThemeToggle.
- Restore PublicFormLayout and SitePageRenderer ThemeToggle.
- AuthFlowShell keeps ThemeToggle by default; Platform login sets `showAppearanceToggle={false}`.

## 5. Implementation Handoff

Scope: **Minor** — Developer implements on `cursor/light-only-appearance-59c2`.

Success criteria:

- Matrix A–E: Platform (+ OS dark, stored dark, stored system, platform login) → light.
- Matrix F–H: tenant dashboard dark / light / system+OS dark resolve correctly.
- Matrix I–L: Settings Appearance, tenant ThemeToggle, registration theme, website theme preserved.
- Route transition: tenant dark → Platform light → tenant dark; no appearance PATCH to light.
- New `bmad-code-review` on the new HEAD. STOP before merge.

Checklist:

- [x] Trigger understood (owner scope correction)
- [x] Problem categorized (mis-scoped previous correction)
- [x] Evidence collected (PR #431 diff vs main)
- [x] Epic 44 still completable
- [N/A] No epic resequence
- [x] Restore out-of-scope files
- [x] Platform-only overlay
- [x] Tests rewritten

## 6. Closure

- Merged PR #431. Accepted HEAD `d9c413badb7ea52ee7fa6c4bef24d6f8c8570133`.
- Main merge `4d058ebf8fef04021c8d39477b01e23725fe296a`.
- Exact-head CI `38029492629` green. Post-merge main CI `38032215748` green.
- Epic 44 stays in-progress. No deploy.
