# Investigation: PR #431 out-of-scope theme removals

## Hand-off Brief

1. **What happened.** HEAD `d1540d1e` implemented a global Cohestra light-only lock that deleted tenant/public theme architecture. Owner superseded that with PlatformAdmin-only light.
2. **Where the case stands.** Out-of-scope product files were restored from `origin/main`. Remaining work is a PlatformAdmin route override plus tests/docs that still describe the global lock.
3. **What's needed next.** Keep the existing theme tree; force light only on `isPlatformLightOnlyPath`; rewrite tests and current-facing docs.

## Case Info

| Field            | Value |
| ---------------- | ----- |
| Ticket           | PR #431 |
| Date opened      | 2026-10-10 |
| Status           | Concluded |
| System           | Cohestra web theme (`next-themes`) |
| Evidence sources | `git diff origin/main...d1540d1e`, current working tree, owner correction |

## Problem Statement

Owner hypothesis: PR #431 removed theme functionality outside PlatformAdmin. That global removal is now out of scope.

## Evidence Inventory

| Source | Status | Notes |
| ------ | ------ | ----- |
| `origin/main...d1540d1e` | Available | Global deletions of ThemeProvider/Toggle/Settings Appearance/next-themes |
| Working tree restore | Available | Product files restored from main; Platform overlay in progress |
| Owner correction | Available | Authoritative scope: PlatformAdmin only |

## Investigation Backlog

| # | Path to Explore | Priority | Status | Notes |
| - | --------------- | -------- | ------ | ----- |
| 1 | Diff every #431 file vs main | High | Done | Classify Platform-only vs restore |
| 2 | First-paint ThemeScript | High | Done | Must branch on Platform path before storage/OS |
| 3 | Preference mutation | High | Done | Visiting Platform must not PATCH or write storage |

## Timeline of Events

| Time | Event | Source | Confidence |
| ---- | ----- | ------ | ---------- |
| 2026-10-10 | Global light-only shipped on `cursor/light-only-appearance-59c2` | `12f02080` / `d1540d1e` | Confirmed |
| 2026-10-10 | Owner: previous correction too broad | User query | Confirmed |

## Confirmed Findings

### Finding 1: HEAD deleted the theme runtime globally

**Evidence:** `git diff --name-status origin/main...d1540d1e` deleted `theme-provider.tsx`, `theme-toggle.tsx`, `theme-preference-sync.tsx`, `appearance-section.tsx`, `public-theme-storage.ts`, and removed `next-themes` from `web/package.json`.

**Detail:** Not required solely to keep PlatformAdmin light.

### Finding 2: Tenant/public ThemeToggle consumers were stripped

**Evidence:** `admin-top-bar.tsx`, `public-form-layout.tsx`, `site-page-renderer.tsx`, `auth-flow-shell.tsx` lost ThemeToggle at `d1540d1e`.

**Detail:** Restore. Only `/platform/login` should hide the control via explicit `showAppearanceToggle={false}`.

### Finding 3: Settings Appearance was removed

**Evidence:** `settings-sections.ts` and `appearance-section.tsx` deleted at `d1540d1e`.

**Detail:** PlatformAdmin does not use tenant Settings. Restore route, radios, and profile persistence.

### Finding 4: Brand accent and `.dark` tokens were flattened

**Evidence:** `brand-accent.ts` lost the dark branch; `brand-tokens.css` lost `.dark` inversion; `semantic-text-tokens.ts` emptied dark pairs.

**Detail:** Restore. Platform light lock must not disable tenant dark tokens.

### Finding 5: ThemeScript at HEAD ignored path

**Evidence:** `web/lib/theme-light-only.test.ts` asserted the init script never reads storage or `prefers-color-scheme`.

**Detail:** Correct for a global lock; wrong for Platform-only. Script must force light only when `isPlatformLightOnlyPath`.

## Deduced Conclusions

### Deduction 1: Preferred architecture is a route override, not a second theme tree

**Based on:** Findings 1–5 and existing `forcedTheme` / ThemeScript design.

**Reasoning:** `next-themes` `forcedTheme="light"` does not persist. ThemeScript can apply light before paint. ThemePreferenceSync must skip Platform so `setTheme(profile)` cannot fight the override or write light.

**Conclusion:** One ThemeProvider; `isPlatformLightOnlyPath` is the only shared route helper.

## Hypothesized Paths

### Hypothesis 1: Global deletion was required to fix Platform Overview dark UI

**Status:** Refuted

**Theory:** Removing tenant themes was the only way to keep Platform light.

**Would refute:** Platform can force light via ThemeScript + `forcedTheme` while tenant `.dark` remains.

**Resolution:** Owner scope and existing next-themes `forcedTheme` refute the theory.

## Missing Evidence

| Gap | Impact | How to Obtain |
| --- | ------ | ------------- |
| Live first-paint under OS dark | Visual flash | Playwright + MutationObserver after implementation |

## Source Code Trace

| Element | Detail |
| ------- | ------ |
| Error origin | Global light-only ThemeScript / deleted theme modules at `d1540d1e` |
| Trigger | Owner asked for light-only; implementation applied it to every surface |
| Condition | Any stored/OS dark preference |
| Related files | `theme-config.ts`, `theme-provider.tsx`, `theme-preference-sync.tsx`, `auth-flow-shell.tsx`, `platform-login-page-client.tsx` |

## Conclusion

**Confidence:** High

PR #431 HEAD `d1540d1e` removed supported tenant/public Light/Dark/System capabilities that are outside the corrected PlatformAdmin-only scope. Restore those files from main. Add a route-level light override that does not persist.

## Recommended Next Steps

### Fix direction

1. Restore out-of-scope theme files from `origin/main`.
2. Add `isPlatformLightOnlyPath`.
3. ThemeScript: Platform → light before storage/OS.
4. ThemeProvider: `forcedTheme="light"` on Platform only.
5. ThemePreferenceSync: skip Platform (no profile write).
6. AuthFlowShell: keep toggle by default; Platform login passes `showAppearanceToggle={false}`.
7. Replace global light-only tests with matrix A–L plus route-transition.

## Reproduction Plan

1. Store operator theme `dark`, emulate `prefers-color-scheme: dark`.
2. Open `/platform/login` and `/platform/overview` → light, no `html.dark`, no toggle.
3. Open tenant `/dashboard` with selected dark → `html.dark` present.
4. Visit Platform and return → tenant still dark; no appearance PATCH to light.

## Side Findings

- Marketing apex routes already lock light via `isMarketingLightOnlyPath`. That existing capability stays. It is not the PlatformAdmin contract.
- Historical global-light-only artifacts remain historical.
