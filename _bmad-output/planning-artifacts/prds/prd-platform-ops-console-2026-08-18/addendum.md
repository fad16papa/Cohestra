# Addendum — Platform ops console v2

Not PRD. Mechanism, research, rejected alternatives.

## Research digest (2026-08-18)

Mature B2B ops without standing login-as:

- **Stripe / Vercel:** ticket thread + account metadata; recovery via authenticated or ownership-checked email flows; no public god-mode session.
- **Auth0:** admin-triggered MFA/reset; session delegation only as a *customer-built* actor claim.
- **GitHub:** never impersonate; recovery is automated + reviewed 2FA disable.
- **Notion:** time-boxed, customer-granted support access — **rejected for Cohestra v1** (still a form of act-as; A-5).
- **Clerk impersonate user:** anti-pattern we explicitly kill.

Copy: Tenant Snapshot + Issue thread + audited reset email. Do not copy: CRM dump, standing privileged tenant JWT.

## Mechanism notes (for architecture, not requirements)

- Snapshot reads `ITenantAccessService.GetUsageAsync` + `TenantPlanLimits.For(plan)` + members query via approved Platform Admin EF bypass.
- `LastActivityAt` already updates on login and public registration (`TouchActivityAsync`). OQ-4 whether that is enough vs max(registration.created_at).
- Replies: new table or Issue timeline rows; Internal Note stays the existing field (never copied into Reply emails).
- Recovery: call the same application services as `/api/v1/auth/forgot-password` and verify resend; do not mint tokens for Platform Admin on that Tenant.
- Omni-search: PlatformAdminOnly; parameterized ILIKE on slug/name/email/issue_number; no `clients` join.
- Create Tenant: existing `POST /api/v1/platform/tenants`.
- Session: document separate browser profile for `/platform/login` vs `{slug}/login` (README). Not a code FR.

## Rejected alternatives

| Alternative | Why killed |
|-------------|------------|
| Login-as-Operator | Enterprise A-5, FR-7, isolation |
| Public cannot-sign-in form in this epic | Abuse; Recovery Actions first |
| Default `/platform` → inbox | Directory is FR-2 control plane; badge instead |
| Stripe id in Omni-search | Forge locked slug/email/SUP |
| Auto-create Tenant Admin on provision | Empty husk + invite; no hidden user |
| Intercom / Gmail API | Issue Number match is enough |

## Personas (inline only)

Francis = Platform Admin. Filer = Operator who submitted the Issue. Gita (forge) = locked-out Operator — UJ-3. Not a standalone persona section in the PRD.
