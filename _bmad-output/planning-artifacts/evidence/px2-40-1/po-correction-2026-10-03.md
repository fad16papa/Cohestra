# Story 40.1 PO correction — 2026-10-03

Status: review / in-progress. Not done. PR #367 remains draft.

## PR base

| Field | Value |
| --- | --- |
| PR | https://github.com/fad16papa/Cohestra/pull/367 |
| Previous base | `cursor/story-38-4-tokens-shell-0fcb` |
| Corrected base | `main` (`2350bdbd46003bea215a7eaa26bcb1f49c1d98f6`) |
| Branch | `cursor/story-40-1-dashboard-command-center-0fcb` |
| Retarget method | `update_pr` base change only — no rebase, no history rewrite |
| Implementation HEAD | `4961dde68844c1b96702a90767dcf1d38e3bbb36` |

Diff `origin/main...HEAD` remains Story 40.1 only (~31 files after the client fallback and this evidence). No Story 40.2 files or tracker keys.

## Active-view no-op

`commitDashboardViewChange` returns `"noop"` when `mode === currentView` and does not write localStorage, dispatch `cohestra.dashboard.viewMode`, pin history, or `router.push`.

Regression: `web/lib/dashboard-view-mode.test.ts` and Playwright `re-selecting the active view is a true no-op`.
