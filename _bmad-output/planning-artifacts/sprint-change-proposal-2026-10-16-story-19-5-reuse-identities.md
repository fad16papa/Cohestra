# Sprint Change Proposal — Story 19.5 reuse existing UAT identities

**Date:** 2026-10-16  
**Trigger:** Owner decision to reuse existing UAT tenants/users/email before creating new ones.  
**Story:** 19.5 remains **in-progress**. Epic 19 remains **in-progress**. Production **NO-GO**.

## Change

1. Treat `UAT_AUTO_BASIC_*` / `UAT_AUTO_PRO_*` as aliases for existing
   isolated UAT TenantAdmins (`default` Basic candidate, `creativorare` Pro).
2. Remove OTP mailbox as a Story 19.5 blocker. 19.3 + Epic 45.5 already
   own signup OTP. Canonical 19.5 is existing-operator login + §7 flows.
3. Wire `UAT_AUTO_PRO_*` into the Deploy UAT browser job (they were missing).
4. Log 19.5 Playwright in on the **tenant host**, not marketing apex.
5. Do not provision a new Basic user, Pro user, mailbox, or SendGrid config
   unless a later login failure proves the mapped identity is missing.

## Impact

| Artifact | Change |
| -------- | ------ |
| Story 19.5 AC | Unchanged. Evidence path now reuses existing UAT identities. |
| Epic 45.5 | Unchanged. Mailbox skip-gate stays on the OTP spec only. |
| Story 19.3 | Unchanged / DONE. |
| Story 19.4 | Unchanged / FROZEN. Do not suspend CreativoRare. |
| Production | NO-GO. |

## Risks

- Live Plan for `default` is unverified without SQL. If it is not Basic,
  map a different existing Basic tenant via `UAT_AUTO_BASIC_SLUG`.
- If `default` has no TenantAdmin, mapping will skip/fail closed. Next
  step is a controlled password reset on an existing test identity, not a
  new tenant.
- Suspend/archive AC still needs a disposable UAT tenant later. That is
  separate from dashboard/analytics credential mapping.
