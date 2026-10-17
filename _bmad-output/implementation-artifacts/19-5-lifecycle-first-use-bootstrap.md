# Story 19.5 — first-use UAT PlatformAdmin bootstrap

Status: **DONE**. Tracker/evidence only. No secret values.
Operator sign-off APPROVED. PM sign-off APPROVED. Production cutover
NOT AUTHORIZED. Historical machine evidence below is unchanged.

## Live first-use result (2026-10-17)

- Main: `e01674664111eae02b61b2863e5d7a201b7a9833`
- Deploy UAT: `39011680830`
- `UAT_AUTO_LIFECYCLE_ENABLED`: `true` (Environment variable)
- PlatformAdmin email/password: PRESENT / MASKED
- Initial login: PASS (identity already authenticated; 401/403 did not occur)
- Bootstrap: NOT REQUIRED (oneshot steps skipped)
- Retry login: not needed
- Role exclusivity: PASS
- Disposable tenant: `uat-19-5-lifecycle-e0167466-11680830`
- Suspend / maintenance / reactivate / archive / archived 404: PASS
- Audits: TenantCreated, TenantSuspended, TenantReactivated, TenantArchived
- Protected tenant guard: PASS
- Host `PlatformAdminSeed__Enabled`: false
- Paddle mutation: NONE
- Lifecycle: PASS

## Owner configuration (2026-10-17)

GitHub Environment `uat` now has:

- Variable `UAT_AUTO_LIFECYCLE_ENABLED=true`
- Secret `UAT_AUTO_PLATFORM_ADMIN_EMAIL`
- Secret `UAT_AUTO_PLATFORM_ADMIN_PASSWORD`

The aliases are dedicated and brand new. The PlatformAdmin user is not
assumed to exist. Owner will not create the account or sign in first.

## Prior run that is not lifecycle evidence

- Main: `4523097fb4acd89f539f3931781107db02c867cf`
- Deploy UAT: `39009526569`
- Lifecycle: `SKIP: lifecycle_disabled` (inputs were not configured yet)

Preserved machine evidence from that run: 45.4 PASS, Basic PASS, Pro
PASS, browser 31/5/0, shaMatch PASS. Do not count that skip as lifecycle
PASS.

## Expected first-use sequence

1. Login as the dedicated PlatformAdmin.
2. 401/403 is expected if the identity is absent.
3. One-shot seed via `deploy/uat-platform-admin-oneshot.sh`.
4. Do not persist the seed password. Leave `PlatformAdminSeed__Enabled`
   disabled on the running API.
5. Retry login. Require exclusive `PlatformAdmin` (no TenantAdmin /
   TenantMember). Collision → `OWNER_GATE=platform_admin_bootstrap_conflict`.
6. Create one `uat-19-5-lifecycle-*` Basic / Complimentary / Free tenant.
7. Suspend → public maintenance. Reactivate. Archive → public 404.
8. Audits: TenantCreated, TenantSuspended, TenantReactivated,
   TenantArchived.

Never mutate `default`, `picklemania`, or `creativorare`. No Paddle.

## Trigger

`workflow_dispatch` is not available to the automation token (403).
This tracker update is the authorized trigger for a fresh Deploy UAT.
