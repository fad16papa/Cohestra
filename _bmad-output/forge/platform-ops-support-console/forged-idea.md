# Ops console v2 — HARDENED

Francis can support a club **without becoming the club**.

## Locks

- **Snapshot, not impersonation.** One `TenantSnapshot` on ticket detail and tenant detail: plan, billing dials, complimentary, limit meters, last login, last public registration, open issue count, demo/load-test flag, operator/member emails+roles. No clients, phones, or registration answers.
- **Talk back.** Operator-visible replies + email to the **filer** on reply and on WaitingOnOperator / Resolved / Closed. `InternalNote` stays ops-only. Append-only timeline.
- **Recovery, not login-as.** Audited `SendPasswordResetEmail` / `ResendEmailVerification` for a known tenant member. Same OTP/reset pipelines. Ops never sets a password.
- **Provision UI.** Form wraps existing `POST /api/v1/platform/tenants`. No auto TenantAdmin user. Complimentary stays a separate audited action.
- **Find it.** Omni-search (slug, operator email, SUP) + directory filters (status, billingStatus, hideLoadTest). Support nav **badge** for open count. Directory remains `/platform` home.
- **Links.** Issue ↔ tenant; `mailto` admin contact; audit rows show actor **email**.
- **Shape.** One Next app, `/platform/*`, `PlatformAdminOnly`, approved EF bypasses only.

## Killed

- Impersonation / login-as (FR-7 / A-5)
- Client PII export, activity editing from platform
- Stripe writes (read-only dials already on the tenant)
- Public cannot-sign-in form (abuse; defer)
- Changing default home to tickets
- Second web app, Intercom, SLA, assignment, sponsored expiry

## First build order

1. Snapshot DTO + card  
2. Reply thread + filer email  
3. Member list + recovery actions  
4. Omni-search / filters / badge  
5. Create-tenant form  

Downstream: `bmad-prd` or `bmad-create-epics-and-stories`.
