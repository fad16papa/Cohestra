---
story: 19.3
head: 9b1ce9d27d9f1834a2b08795efe09601154373a4
reviewer: grok-4.6
date: 2026-10-16
---

# Exact-HEAD review — 19.3 Layer A fail-closed `9b1ce9d2`

## Scope

- Host probe fails closed unless recaptcha is enabled and configured, with bypass tokens absent
- Layer A Playwright: widget/script, no site-key/domain/CSP failure, bounded empty + invalid token rejects
- No live challenge solve
- `ACCEPTANCE_STORY=19.3` on Deploy UAT summary
- Evidence: owner recaptcha gate resolved (names only)

## Findings

| Sev | Finding | Disposition |
| --- | --- | --- |
| BLOCKER | none | — |
| MAJOR | none | — |
| MINOR | Probe reads host `.env`; widget proof still depends on the web rebuild | accepted — that is why this commit exists |
| NIT | Empty/invalid probes run only on 1440 to avoid extra Google siteverify calls | accepted |

## Verdict

PASS — BLOCKER=0, MAJOR=0. Do not close 19.3 until live Deploy UAT artifacts pass. Production NO-GO.
