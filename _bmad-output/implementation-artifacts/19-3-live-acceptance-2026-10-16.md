---
story: 19.3
status: done
date: 2026-10-16
deploy_run: 38911205011
sha: 26f594bc73911e28648604e8e7d2c1ead4e9a851
---

# Story 19.3 live acceptance — 2026-10-16

Deploy UAT `38911205011` on accepted main `26f594bc`.

## SHA provenance

PASS: main = CI = TARGET = DEPLOY = droplet HEAD = API GIT_SHA = acceptance SHA = summary SHA = `26f594bc73911e28648604e8e7d2c1ead4e9a851`

## Host probe (no secret values)

- `serverEnabled`: true
- `webEnabled`: true
- `secretConfigured`: true
- `siteKeyConfigured`: true
- `bypassTokenAbsent`: true
- `webTestTokenAbsent`: true

## Layer A (`https://uat.cohestra.app`)

Playwright 1440×900 and 390×844:

- `/signup` loads
- Google reCAPTCHA script + v2 checkbox iframe render
- no invalid site-key / domain-owner error
- no recaptcha CSP console rejection
- does not solve the live challenge
- empty CAPTCHA POST → 400
- invalid CAPTCHA POST → 400 (one bounded probe)

Browser: expected 12, skipped 6 (authenticated + mobile negative probes), unexpected 0.

## Layer B

Isolated CI path from #459 remains green (signup → OTP → verify-email → `/admin/me` → onboarding). Official Google test keys are not in the repo and are not on UAT.

## Also

- public smoke PASS (`/ready`, `/`, `/signup`)
- shared CRM untargeted (`EXISTING_APP_PUBLIC_URL` missing; port isolation held)
- `acceptance-summary.json` story=`19.3` result=`pass`
- production NO-GO
