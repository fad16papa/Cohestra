---
story: 19.5
head: dd0ae2f92fe673dd845875f5b3d3ba9ec0cedac5
reviewer: grok-4.6
date: 2026-10-17
---

# Exact-HEAD review — 19.5 Basic slug injection `dd0ae2f9`

## Scope

- Deploy UAT browser job passes `UAT_AUTO_BASIC_SLUG` / `UAT_AUTO_PRO_SLUG`
  from Environment `uat` vars (not hardcoded)
- Playwright keeps fallbacks `default` / `creativorare`
- 45.4 login fills `#email` / `#password` and uses the Basic tenant host
- Investigation supersedes `basic_credentials_invalid`

Does not touch Paddle, billing, tenant suspend/archive, or production.

## Findings

| Sev | Finding | Disposition |
| --- | ------- | ----------- |
| BLOCKER | none | — |
| MAJOR | none | — |
| MINOR | Empty `vars.UAT_AUTO_BASIC_SLUG` still falls back to `default` | accepted — owner maps `picklemania` on Environment `uat`; logs echo the raw slug |
| NIT | 45.4 now follows the tenant host so apex login cannot re-fail the job | accepted — locator + host are the same Basic operator |

Checked: no `picklemania` in Playwright source; contract scripts require `vars.UAT_AUTO_*_SLUG`; no secret values printed.

## Verdict

PASS — BLOCKER=0, MAJOR=0. Story 19.5 stays OPEN until Deploy UAT scores Basic on the mapped slug. Production NO-GO.
