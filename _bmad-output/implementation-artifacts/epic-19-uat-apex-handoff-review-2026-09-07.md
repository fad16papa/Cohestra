# BMAD review — UAT apex auth handoff

**HEAD:** implementation commit on this branch (apex handoff + JWT admin bind)
**Live evidence:** `https://uat.cohestra.app/dashboard?handoff=…` showed “sign-in link expired” after OTP. Leaf TLS was valid.

## Root cause

`buildTenantDashboardUrl` keeps operators on `uat.cohestra.app` (no `*.uat` DNS). Login/checkout then POSTs `/api/v1/auth/handoff/exchange` on the marketing apex. Middleware treated that as a public tenant route and returned 404 (“Marketing host has no tenant SitePage context.”). The UI maps any failed exchange to “expired.”

Wrong-tenant Host exchange stays 400. Codes stay single-use.

## Fix

- Handoff exchange on marketing apex continues; store accepts `expectedTenantId: null`.
- Admin on marketing apex binds tenant from JWT `tenant_id` via `ResolveByIdAsync` (still never X-Tenant-Id). Tenant Host alignment unchanged.

## Tests

- Middleware: exchange on `uat.cohestra.app` continues; admin JWT bind on apex.
- In-memory store: apex exchange consumes once.
- Integration: `HandoffExchange_OnUatMarketingApex_Succeeds_AndAdminMeWorks`.

## Decision

PASS pending live API `--build` (do not use a CACHED publish). Existing handoff codes are dead; operator signs in again.
