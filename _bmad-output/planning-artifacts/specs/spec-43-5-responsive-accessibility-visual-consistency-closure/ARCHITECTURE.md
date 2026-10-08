# Architecture 43.5 — cookie state + Axe helper only

## Cookie consent state

Key: `cohestra-marketing-cookie-consent` (unchanged).

| Stored | Meaning | Banner |
| ------ | ------- | ------ |
| missing / `""` / unreadable | undecided | show (unless `#crm`) |
| `accepted` | Accept (legacy + Preferences optional on) | hide |
| `essential` | Reject non-essential / optional off | hide |
| any other string | prior decision (compat) | hide |

No JSON blob. No PII. No cookies written beyond this localStorage flag.

Layout boundary: `MarketingShell` keeps **window** as the scroller (Cinema). Banner mounts **in-flow below the header** when visible. `ResizeObserver` sets `--marketing-cookie-banner-height` on the shell; `0px` when hidden.

Preferences: existing `components/ui/dialog.tsx` (38.6). Do not create a new modal primitive.

Optional analytics: **not executed**. Preferences may record choice only.

## Axe helper

`web/lib/axe-disabled-contrast.ts` — pure filter.
`web/e2e/helpers/analyze-axe.ts` — Playwright wrapper. No global disabled excludes. No `.disableRules(["color-contrast"])`.

Callers that currently `.exclude("[disabled]")` migrate to the wrapper. Extra non-disabled excludes (e.g. `.border-warn\\/30`) may remain with a comment.
