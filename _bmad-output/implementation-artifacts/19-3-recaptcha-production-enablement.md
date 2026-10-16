---
epic: 19
story: 3
status: in-progress
created: 2026-10-15
updated: 2026-10-15
acceptance_method: epic-45-dual-layer
---

# Story 19.3: reCAPTCHA production enablement

Status: **in-progress** — owner recaptcha gate resolved (names on droplet `.env`). Layer B isolated OTP path is on main (#459). Layer A runs on the next Deploy UAT web rebuild. This is **not** production cutover.

Signup implementation already exists. This story is UAT-domain key configuration + automated rebuild + **machine-verifiable** dual-layer acceptance.

## Current UAT state (2026-10-16)

- Owner gate: real UAT recaptcha names installed privately in `/home/deploy/cohestra/.env`.
- Values are never pasted. The sanitized probe must independently verify presence/booleans.
- `NEXT_PUBLIC_*` are build-time; Deploy UAT must rebuild web after this commit.
- `docker-compose.uat.yml` still defaults recaptcha **off** in git so a missing host env cannot silently enable a bypass.
- Isolation contract refuses leftover `TestBypassToken` on UAT compose.
- Layer A Playwright now fails closed if the widget is missing (no skip).

Do **not** mark this story done until Layer A and Layer B artifacts pass on an accepted SHA.

## Course correction (2026-10-15)

A manual human solve of the live Google challenge is **not** required for machine acceptance. That is not a security reduction.

- **Layer A** proves real UAT configuration, widget render, CSP, and negative rejects. It does **not** solve the challenge.
- **Layer B** proves the positive signup → OTP → session path on an isolated CI stack. Official Google v2 test-key *behavior* is stubbed (`IsolatedOfficialBehaviorHandler`); official keys are not stored in the repo (GitGuardian).

Forbidden: CAPTCHA-solving services; disabling recaptcha on real UAT; writing test keys into live UAT or production; owner SSH/copy-paste as the evidence path.

## One-time owner bootstrap (values never in chat)

Real UAT keys belong on the droplet `.env` (or an equivalent host secret channel), not in git:

- `SelfServeSignup__Recaptcha__Enabled=true`
- `SelfServeSignup__Recaptcha__SecretKey` (value never pasted here)
- `NEXT_PUBLIC_RECAPTCHA_ENABLED=true`
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` (value never pasted here)

Do **not** set `SelfServeSignup__Recaptcha__TestBypassToken` or `NEXT_PUBLIC_RECAPTCHA_TEST_TOKEN` on UAT.

After Epic 45.1–45.3 exist, enablement is applied by the automated deploy/rebuild, not by an owner compose session.

## Acceptance — Layer A (real UAT, `https://uat.cohestra.app`)

Machine-verifiable via host probe + Playwright render/negative checks:

1. Server recaptcha enabled; web recaptcha enabled.
2. Secret configured; site key configured (presence/boolean only).
3. Bypass tokens absent.
4. Google script loads; widget/iframe renders; no domain-key error.
5. CSP permits required recaptcha resources.
6. Empty CAPTCHA token rejected server-side.
7. Invalid CAPTCHA token rejected server-side.
8. Shared CRM remains Healthy. Production remains NO-GO.

Do **not** solve the real human challenge on this layer.

## Acceptance — Layer B (isolated official test keys)

Machine-verifiable on CI ephemeral stack or a clearly isolated automation deployment:

1. Isolated enabled-recaptcha stub (official test-key behavior; no Google keys in source).
2. Dummy CAPTCHA token → signup → OTP retrieve from FakeEmailSender → OTP verify → authenticated `/admin/me` → `/auth/onboarding`.
3. Stub/keys never substituted into normal UAT or production.

## Evidence

`acceptance-summary.json` plus Layer A/B artifacts. Missing evidence is FAIL. No owner-paste PASS.

## Do not

- Mark production GO.
- Ask the owner to SSH for ordinary rebuild/smoke/screenshots.
- Continue the previous “reply that keys are on the droplet, then guide a human E2E walk” path.
