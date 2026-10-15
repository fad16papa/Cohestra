---
epic: 19
story: 3
status: ready-for-dev
created: 2026-10-15
---

# Story 19.3: reCAPTCHA production enablement

Status: **ready-for-dev** — owner gate. This is **not** production cutover.

Signup implementation already exists. This story is UAT-domain key configuration + web rebuild + live signup acceptance.

## Current UAT state (2026-10-15)

- `https://uat.cohestra.app/signup` returns 200.
- Signup HTML has **no** grecaptcha script and **no** widget. reCAPTCHA is **off**.
- `docker-compose.uat.yml` defaults `SelfServeSignup__Recaptcha__Enabled=false` and `NEXT_PUBLIC_RECAPTCHA_ENABLED=false`.
- API `ASPNETCORE_ENVIRONMENT=Production`: disabled captcha accepts empty token (not a local bypass token).
- Isolation contract refuses leftover `TestBypassToken` on UAT compose.
- Code already supports enablement: `RecaptchaCheckbox`, `isRecaptchaEnabled`, `GoogleRecaptchaVerifier`.

Do **not** mark this story done until UAT widget + signup/OTP E2E are proven.

## Owner gate (required)

Do not paste keys into git, chat, or screenshots.

1. In Google reCAPTCHA admin, create **checkbox v2** keys for:
   - `uat.cohestra.app`
   - `*.uat.cohestra.app`
2. On the droplet, as `deploy`, edit `/home/deploy/cohestra/.env` only:
   - `SelfServeSignup__Recaptcha__Enabled=true`
   - `SelfServeSignup__Recaptcha__SecretKey=<secret>`
   - `NEXT_PUBLIC_RECAPTCHA_ENABLED=true`
   - `NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<site key>`
3. Do **not** set `SelfServeSignup__Recaptcha__TestBypassToken` or `NEXT_PUBLIC_RECAPTCHA_TEST_TOKEN` on UAT.
4. Classify without printing secrets: `bash deploy/classify-uat-env.sh`
5. `bash deploy/preflight-launch.sh --strict-recaptcha`
6. Rebuild **web** (NEXT_PUBLIC_* is a build arg) then recreate **api**:
   ```bash
   cd /home/deploy/cohestra
   bash deploy/uat-compose.sh up -d --build web
   bash deploy/uat-compose.sh up -d --no-deps api
   ```
7. Do not change Paddle, catalog, or production DNS.

## Acceptance

1. Apex `/signup` on `https://uat.cohestra.app` shows the reCAPTCHA widget.
2. Legitimate UAT signup + OTP verify completes.
3. Missing / invalid captcha token is rejected.
4. Existing signup rate limits still apply.
5. Shared CRM remains Healthy.
6. Production remains NO-GO.

## After owner applies keys

Reply that keys are on the droplet (no values). This agent will then verify widget presence and guide the E2E walk. Story stays open until that verification.
