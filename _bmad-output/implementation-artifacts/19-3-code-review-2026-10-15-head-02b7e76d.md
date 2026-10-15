---
story: 19.3
head: 02b7e76d0e83317589bf997e58d31de90bd9759f
reviewer: grok-4.6
date: 2026-10-15
---

# Exact-HEAD review — 19.3 Layer B OTP path `02b7e76d`

## Scope

- Isolated Layer B: dummy token → signup → FakeEmailSender OTP → verify → `/api/v1/admin/me` → `/api/v1/auth/onboarding`
- 19.3 remains OPEN: Layer A still requires real UAT recaptcha keys on the droplet `.env`

## Findings

| Sev | Finding | Disposition |
| --- | --- | --- |
| BLOCKER | none | — |
| MAJOR | none | — |
| MINOR | Layer A Playwright still skips until widget/script exist | accepted — owner gate: droplet recaptcha names |
| NIT | Onboarding GET is unauthenticated bootstrap status, not a new-tenant wizard | accepted — authenticated proof is `/admin/me` |

## Verdict

PASS — BLOCKER=0, MAJOR=0. Do not close 19.3. Production NO-GO.
