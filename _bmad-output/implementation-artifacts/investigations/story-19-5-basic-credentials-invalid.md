---
story: 19.5
slug: story-19-5-basic-credentials-invalid
date: 2026-10-17
status: confirmed
deploy_uat: 38999310722
head: 55791870bb4c1b0b13acf9002401544baea6ff7a
---

# Case: Basic aliases present; live default login rejected

## Stronghold (Confirmed)

Deploy UAT `38999310722` on main `55791870`:

- Browser job env dump: `UAT_AUTO_BASIC_EMAIL: ***` and
  `UAT_AUTO_BASIC_PASSWORD: ***` (PRESENT / MASKED, not empty).
- Skip string `UAT_AUTO_BASIC_EMAIL/PASSWORD are not mapped` did **not**
  fire. Basic 19.5 tests RAN on desktop 1440 and mobile 390.
- `loginOnWorkspace` filled `#email` / `#password` on
  `https://default.uat.cohestra.app/login` (default slug).
- Product alert paragraph: `Invalid email or password.`
- URL remained `/login` (20s). Screenshot artifact shows the default
  workspace card and that alert. Mapped values are not recorded here.

Pro rooms + mutating walk PASS on the same run. Same helper, different
aliases/host.

## H1 — Aliases missing (Refuted)

Masked injection is non-empty. Tests ran.

## H2 — Harness did not submit (Refuted)

Email and password fields were populated. Submit is `Sign in to workspace`.
Server returned the standard invalid-credentials alert.

## H3 — 45.4 apex locator caused the 19.5 failure (Refuted)

`authenticated.spec.ts` failed earlier on apex `/login` because
`getByLabel(/password/i)` matched the password input and the Show-password
control. 19.5 uses `#password` on the tenant host and still received
`Invalid email or password.`

## H4 — Credentials rejected on default workspace (Confirmed)

Live default tenant rejected the mapped Basic pair. Repair requires owner
remap of `UAT_AUTO_BASIC_EMAIL` / `UAT_AUTO_BASIC_PASSWORD` and/or
`UAT_AUTO_BASIC_SLUG` if the existing Basic operator is not on `default`.
Do not create another user or tenant. Do not reset the password from here.

## Gate

`OWNER_GATE=basic_credentials_invalid`
