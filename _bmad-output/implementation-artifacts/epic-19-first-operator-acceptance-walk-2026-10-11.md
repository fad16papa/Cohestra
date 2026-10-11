# Story 19.1 — first-operator `/register` walk (prepared, not executed)

**Mutation:** this walk **creates** a default-tenant TenantAdmin and sends a verification email.  
This Cloud Agent did **not** run it. Owner executes only with a mailbox they control.

Public probe 2026-10-11: onboarding `registrationAvailable: true` on `https://uat.cohestra.app`. If that flips to false before the walk, default tenant already has a confirmed TenantAdmin — then record a **login-only** proof instead of creating a second bootstrap user.

## Isolated identity

- URL: `https://uat.cohestra.app/register` (workspace admin, **not** `/signup` and **not** `/register/{activity}`).
- Email: a mailbox the owner controls, unused on UAT. Suggested local-part `uat-19-1-<YYYYMMDD>@…`.
- Do **not** use `operator@cohestra.local` or any production inbox.
- Do **not** paste password, OTP, JWT, or Set-Cookie.

## Steps

1. `GET https://uat.cohestra.app/api/v1/auth/onboarding` → `registrationAvailable: true` (or stop and switch to login-only).
2. Open `/register`. Complete nickname + password. Expect 201 and redirect to `/register/verify?email=…`.
3. Enter OTP from the owner mailbox (SendGrid live on UAT). Do not paste the code.
4. Land on dashboard as default-tenant TenantAdmin.
5. Sign out, sign in at `/login` with the same email.
6. Confirm `/ready` still Healthy and `https://thesocialcollectivesg.com/ready` unchanged.

## Record (non-secret)

| Field | Paste |
|-------|--------|
| Date / SHA | |
| `registrationAvailable` before | |
| Register HTTP status (no body secrets) | |
| Verify succeeded (yes/no) | |
| Dashboard reachable (yes/no) | |
| Login retry succeeded (yes/no) | |
| Existing-app `/ready` still Healthy | |

## Out of scope

- reCAPTCHA enablement (19.3)
- Paddle checkout (19.4)
- Full operator launch sign-off (19.5)
- Production `/register`
