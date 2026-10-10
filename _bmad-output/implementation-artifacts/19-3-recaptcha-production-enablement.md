---
epic: 19
story: 3
status: ready-for-dev
baseline_commit: f293650d3ab3b536e159c2888f562b124540f26f
created: 2026-10-10
---

# Story 19.3: reCAPTCHA production enablement

Status: ready-for-dev

Signup implementation is already accepted. This story is **UAT-domain key configuration + rebuild + real-environment acceptance**. Do not rewrite signup.

## Story

As a **platform operator**,
I want **reCAPTCHA enabled on public signup before launch**,
So that **automated signup abuse is mitigated on the live apex path**.

## DONE requires the Mandatory Code Review Loop

IMPLEMENT → BUILD → TEST → `bmad-code-review` (repeat on new HEAD) → PRODUCT/UAT ACCEPTANCE → CLOSE.

Do not close on unit tests or public HTML probes alone.

## Acceptance Criteria

Copied from `epics-cohestra-enterprise.md` Epic 19.3:

1. UAT `.env` has `SelfServeSignup__Recaptcha__Enabled=true` with valid **UAT-domain** site and secret keys (secure env only; never commit keys).
2. Web build receives `NEXT_PUBLIC_RECAPTCHA_ENABLED=true` + `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`. Rebuild the `web` container after any `NEXT_PUBLIC_*` change.
3. Apex `/pricing` or `/signup` on `https://uat.cohestra.app` renders the reCAPTCHA widget (or completes the v3 flow).
4. Legitimate signup + OTP verify completes end-to-end on UAT.
5. Invalid or missing captcha token is rejected.
6. Existing rate limits still apply (OTP send 3/15 min, verify 10/15 min, resend 5/15 min). Tenant isolation unchanged.
7. Checklist §3 / Signup & abuse reCAPTCHA items are checked with date + URL evidence.

## Existing implementation — reuse, do not reinvent

| Piece | Path |
|-------|------|
| Widget | `web/components/legal/recaptcha-checkbox.tsx` (checkbox v2, `grecaptcha.render`) |
| Flag / site key | `web/lib/signup/signup-api.ts` `isRecaptchaEnabled` / `getRecaptchaSiteKey` |
| Signup page | `web/components/legal/signup-page-content.tsx` |
| API reject | `src/Api/Controllers/V1/PublicSignupController.cs` |
| Verifier | `src/Infrastructure` `GoogleRecaptchaVerifier` via `ICaptchaVerifier` |
| UAT compose | `docker-compose.uat.yml` forwards Recaptcha + `NEXT_PUBLIC_RECAPTCHA_*` |
| Preflight | `deploy/preflight-launch.sh --strict-recaptcha` |
| Classifier | `deploy/classify-uat-env.sh` — Recaptcha enabled is **FREEZE UAT** until 19.3; bypass tokens **REMOVE LOCAL-ONLY** |
| Unit | `src/Infrastructure.Tests/Signup/GoogleRecaptchaVerifierTests.cs` |
| Abuse | `src/Api.IntegrationTests/PublicSignupAbuseIntegrationTests.cs` |
| Prior review | `epic-19-recaptcha-bypass-code-review-2026-09-06.md` |

Owner lock (2026-09-06): UAT captcha is **OFF** until this story. Production-disabled accepting an empty token is **not** a bypass defect. Do not add `TestBypassToken` or `NEXT_PUBLIC_RECAPTCHA_TEST_TOKEN` on UAT.

## Tasks

- [ ] Owner creates Google reCAPTCHA keys scoped to `uat.cohestra.app` and `*.uat.cohestra.app` (not production apex unless separately intended).
- [ ] Owner writes site/secret into droplet `.env` (mode 600). Do not paste values into git, chat, or screenshots.
- [ ] Set `SelfServeSignup__Recaptcha__Enabled=true` and `NEXT_PUBLIC_RECAPTCHA_ENABLED=true`.
- [ ] Confirm bypass keys are absent (`classify-uat-env.sh` without printing secrets).
- [ ] `bash deploy/preflight-launch.sh --strict-recaptcha` on the droplet.
- [ ] Rebuild **web** then recreate **api** so both sides see the keys.
- [ ] Browser: apex signup widget visible; complete one legitimate UAT signup + OTP.
- [ ] Browser/API: missing token rejected; invalid token rejected.
- [ ] Confirm rate-limit 429 still fires; second tenant unchanged.
- [ ] Automated: existing verifier + abuse tests still pass on the story HEAD.
- [ ] `bmad-code-review` on any code HEAD; product/UAT acceptance with evidence.

## Do NOT

- Change Cinema, landing page, or Platform Admin.
- Enable live Paddle or `Paddle__AllowLive`.
- Put secrets in commits, reports, logs, or screenshots.
- Mark PASS from local-only captcha bypass behavior.
- Close while UAT keys are missing or web was not rebuilt.

## Halt / owner actions

Cloud Agent has **no SSH** and **no Google reCAPTCHA admin**. Stop at the env boundary. Owner must:

1. Authorize UAT deploy of current `origin/main` if the droplet is not already on that SHA (19.1).
2. Create UAT-domain keys and place them on the droplet.
3. Rebuild web.

## Dev Agent Record

### Agent Model Used

Grok 4.6 (`bmad-create-story` 2026-10-10; no implementation this run)
