---
story: 19.5
slug: story-19-5-basic-tenant-slug-mismatch
date: 2026-10-17
status: confirmed
deploy_uat: 38999310722
head: 55791870bb4c1b0b13acf9002401544baea6ff7a
---

# Case: Basic credentials valid; automation used the wrong tenant host

Supersedes the earlier `OWNER_GATE=basic_credentials_invalid` conclusion
on this file. Credentials are VALID. Root cause is tenant slug mismatch.

## Stronghold (Confirmed)

Deploy UAT `38999310722` on main `55791870`:

- `UAT_AUTO_BASIC_EMAIL` / `UAT_AUTO_BASIC_PASSWORD`: PRESENT / MASKED.
- Basic 19.5 tests RAN (not SKIP) on desktop 1440 and mobile 390.
- Automation logged in at `https://default.uat.cohestra.app/login`
  because `UAT_AUTO_BASIC_SLUG` was unset and the harness falls back to
  `default`.
- Product alert on that host: `Invalid email or password.`
- `.github/workflows/deploy.yml` browser job did not pass
  `UAT_AUTO_BASIC_SLUG` into Playwright.

Owner-confirmed (2026-10-17): the same mapped Basic credentials sign in
successfully at `https://picklemania.uat.cohestra.app/dashboard`.
UI plan = Basic. Tenant slug = `picklemania`.

## Classification

| Item | Value |
| ---- | ----- |
| BASIC CREDENTIALS | VALID |
| BASIC TENANT | picklemania |
| FAILED TEST HOST | default |
| ROOT CAUSE | tenant slug mismatch |
| OWNER_GATE | basic_tenant_slug_mapping |

NOT invalid credentials. NOT a missing user. NOT a missing password.
NOT GitHub secret propagation. NOT a deployment failure.

Do not create a Basic user, reset the password, rotate credentials, or
create another Basic tenant.

## Hypotheses

### H1 — Aliases missing (Refuted)

Masked injection is non-empty. Tests ran.

### H2 — Harness did not submit (Refuted)

`#email` / `#password` were populated. Submit is `Sign in to workspace`.

### H3 — 45.4 apex locator caused the 19.5 failure (Refuted)

`authenticated.spec.ts` `getByLabel(/password/i)` is a separate
strict-mode miss (password input + Show-password control). 19.5 uses
`#password` on the tenant host and still received the default-workspace
alert.

### H4 — Credentials invalid (Refuted)

Owner manually signed in on `picklemania.uat.cohestra.app` with the same
mapped pair. The default-host rejection is tenant-host mismatch: login
is bound to the workspace host.

### H5 — Wrong Basic tenant slug (Confirmed)

Harness defaulted `UAT_AUTO_BASIC_SLUG` to `default`. Deploy UAT never
injected the Environment variable. Live Basic tenant is `picklemania`.

## Repair

Pass `UAT_AUTO_BASIC_SLUG` (and `UAT_AUTO_PRO_SLUG` for symmetry) from
Environment `uat` vars into the Playwright job. Do not hardcode
`picklemania` in source. Owner maps `UAT_AUTO_BASIC_SLUG=picklemania`.

Protected tenants after remap: `picklemania`, `creativorare`, `default`.
Do not suspend/archive any of them.
