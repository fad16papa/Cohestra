# Epic 34 acceptance — Cohestra Intelligence Brief

**Date:** 2026-09-05  
**PR:** https://github.com/fad16papa/Cohestra/pull/287

## Stories

| Story | Implementation | Review | Acceptance |
| --- | --- | --- | --- |
| 34.1 Deterministic brief API | PASS | no BLOCKER/MAJOR | PASS (API + isolation + seeded tenant) |
| 34.2 Dashboard surface | PASS | no BLOCKER/MAJOR | PASS (browser) |
| 34.3 Optional synthesis + fallback | PASS | no BLOCKER/MAJOR | PASS without live vendor (fallback is the product default) |
| 34.4 Observability / cost | PASS | no BLOCKER/MAJOR | PASS (default-off, caps, safe logs) |

## Cross-story review

- End-to-end: operator opens Dashboard → Needs attention → evidence → Clients/Reports/Activities deep links.
- Facts are computed in SQL/app logic; the model may only rewrite wording behind a guard.
- Tenant isolation holds on the fact engine (unit + HTTP TenantIsolation).
- No chatbot, no autonomous writes.
- Cinema remains frozen; this epic is the real product the cinema AI pill promised.

## Residuals (do not reopen unless they become production blockers)

- Clients URL does not persist `withoutOutreach`; new-people deep link is `leadStatus=new`.
- Live synthesis vendor not exercised in this environment (owner must supply `Intelligence__ApiKey` to enable).

## Close rule

Verified on `main` at `cc21af7` (PR #287 squash). Stories and epic marked done. Epic 34 is frozen.
