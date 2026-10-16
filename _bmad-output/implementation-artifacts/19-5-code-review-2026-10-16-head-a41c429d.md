---
story: 19.5
head: a41c429d2fa308b8591e4f12a435cdc54b3c3c09
reviewer: grok-4.6
date: 2026-10-16
---

# Exact-HEAD review — 19.5 login hydration `a41c429d`

## Scope

- `web/components/auth/login-form.tsx`: `method="post"` so a pre-hydration
  submit cannot put credentials in the query string
- `web/e2e-uat/operator-core-flows.spec.ts`: wait `networkidle`, then fill
  `#email` / `#password`; mutating walk uses the browser session token
- Contract grep for POST + hydration wait

## Findings

| Sev | Finding | Disposition |
| --- | ------- | ----------- |
| BLOCKER | none | — |
| MAJOR | none | — |
| MINOR | Deploy UAT `38926859046` mutating walk also returned 500 on `POST /admin/activities` after API login succeeded | accepted — next live run uses `page.request` after UI login; if 500 repeats, investigate product/catalog on CreativoRare |
| MINOR | Playwright error-context from the failed run captured a native GET of the login form | accepted — owner should rotate `UAT_AUTO_PRO_PASSWORD`; this HEAD stops query-string submits |
| NIT | 45.4 `authenticated.spec.ts` still uses `domcontentloaded` | accepted — Basic aliases skipped; 19.5 is the tenant-host path |

Checked: skip strings unchanged; no OTP mailbox; no secret values in this HEAD; no Paddle/billing; no suspend/archive of protected tenants.

## Verdict

PASS — BLOCKER=0, MAJOR=0. Story 19.5 stays OPEN pending the next Deploy UAT skip-vs-run. Production NO-GO.
