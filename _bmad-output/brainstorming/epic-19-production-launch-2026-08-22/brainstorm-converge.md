# Epic 19 brainstorm — converge (2026-08-22)

**Techniques used:** Pre-mortem (party), Evidence ladder (brainstorm), Risk matrix (Murat), Jobs-to-be-Done per story (John)

## Must do (Epic 19 stories — in order)

| # | Story | Owner | Done when |
|---|-------|-------|-----------|
| 1 | 19.1 Droplet + smoke | Ops/Dev | `uat-smoke.sh --full` exit 0 on HTTPS-capable URL |
| 2 | 19.2 HTTPS + headers | Ops | `verify-security-headers.sh https://…` + HSTS |
| 3 | 19.3 reCAPTCHA | Ops | Apex signup E2E on live URL |
| 4 | 19.4 Stripe test | Ops | Checkout + webhook 200 |
| 5 | 19.5 §7 sign-off | Operator | Checklist table filled |

## Should do (during Epic 19)

- Bootstrap Basic + Pro tenants on first droplet deploy
- Header verify on tenant + apex + platform login
- Negative test: Redis down → 503 on OTP (18.4 confirmation)
- Platform support smoke (Settings → Help → platform inbox)

## Won't do (Epic 19)

- Live Stripe keys (production cutover is post-19.5 decision)
- Sender settings UI
- CSP report-only rollback
- New product features

## Single best next action

**Execute 19.1 on the droplet** — provision, `.env`, compose up, `uat-smoke.sh --full` with `SMOKE_TENANT_HOST` set. Capture command output as story evidence.

If no droplet yet: run `bash deploy/preflight-launch.sh` locally, then follow `docs/deploy/digitalocean-uat.md`.
