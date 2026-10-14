# Story 19.1 — first-operator `/register` walk (prepared, not executed)

**Mutation:** this walk **creates** a default-tenant TenantAdmin and sends a verification email.  
This Cloud Agent did **not** run it. Owner executes only with a mailbox they control.

Public probe 2026-10-11: onboarding `registrationAvailable: true` on `https://uat.cohestra.app`. If that flips to false before the walk, default tenant already has a confirmed TenantAdmin — then record a **login-only** proof instead of creating a second bootstrap user.

## Isolated identity

- URL: `https://uat.cohestra.app/register` (workspace admin, **not** `/signup` and **not** `/register/{activity}`).
- Email: a mailbox the owner controls, unused on UAT. Suggested local-part `uat-19-1-<YYYYMMDD>@…`.
- Do **not** use `operator@cohestra.local` or any production inbox.
- Do **not** paste password, OTP, JWT, or Set-Cookie.
- Do **not** invent that a bootstrap account already exists.

## Gate

`GET https://uat.cohestra.app/api/v1/auth/onboarding`

- `registrationAvailable: true` → **create** path below (mutates UAT: user + email).
- `registrationAvailable: false` → **login-only** path. Do not POST `/api/v1/auth/register`.
- Unreachable / unexpected JSON → **BLOCKED**, not FAIL. Paste status + `registrationAvailable` only.

## Create path (only if available)

1. Open `/register`. Complete nickname + password. Expect 201 and redirect to `/register/verify?email=…`.
2. Enter OTP from the owner mailbox (SendGrid live on UAT). Do not paste the code.
3. Land on dashboard as default-tenant TenantAdmin.
4. Sign out, sign in at `/login` with the same email.
5. Confirm `/ready` still Healthy and `https://thesocialcollectivesg.com/ready` unchanged.

## Login-only alternative (bootstrap already closed)

Use an existing UAT TenantAdmin the **owner already knows**. Do not invent an email or ask this agent to guess.

1. Open `https://uat.cohestra.app/login`.
2. Sign in. Land on dashboard.
3. Confirm `/ready` Healthy and existing-app `/ready` unchanged.
4. Record that create was skipped because `registrationAvailable: false`.

## Record (non-secret)

| Field | Paste |
|-------|--------|
| Date / SHA | |
| Path used (create / login-only) | |
| `registrationAvailable` before | |
| Register HTTP status (create path only; no body secrets) | |
| Verify succeeded (create path; yes/no) | |
| Dashboard reachable (yes/no) | |
| Login succeeded (yes/no) | |
| Existing-app `/ready` still Healthy | |

## Out of scope

- reCAPTCHA enablement (19.3)
- Paddle checkout (19.4)
- Full operator launch sign-off (19.5)
- Production `/register`
