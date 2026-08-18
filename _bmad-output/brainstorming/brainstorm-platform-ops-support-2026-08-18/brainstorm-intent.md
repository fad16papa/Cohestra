# Brainstorm intent — platform ops & support

**Topic:** Platform admin/support gaps vs shipped Epic 11/26/27 console  
**Goal:** Lock next slice so Francis can support clubs without impersonation or a second app  
**Date:** 2026-08-18

## Insight

Ops cannot see the club without becoming the club. **Tenant snapshot + audited recovery** replaces impersonation. Tickets already carry `tenantId` / `plan` / `userAgent`; tenant rows already have billing dials and `adminContactEmail` — the gap is joining them on one screen and talking back to the filer. **Do not rebuild Gmail** — match-by-SUP number; inbox already does copy-paste.

## Shipped today

- Tenant directory + detail: suspend / reactivate / archive, complimentary, recent audits
- Support inbox: list / detail / status / internal note / attachments
- Volume report + CSV
- Operator Settings Help: file tickets with screenshots
- Two login doors: `/login` vs `/platform/login`
- `POST` Create tenant API (no UI)
- `WaitingOnOperator` status; issue has `tenantId`, `plan`, `userAgent`, attachments
- Complimentary set/clear (no expiry)
- Per-tenant recent audit log
- Billing read-only dials on tenant row (`PastDue` / `OnHold`)

## Gaps

- No tenant snapshot (plan caps, last login, last registration, seat emails) on ticket or tenant detail
- No operator-visible reply thread; internal notes are ops-only → filers file second tickets
- No audited recovery: send password reset, resend verify OTP
- No Create-tenant UI (sales still asks for SQL)
- No omni-search (slug / email / SUP / Stripe id)
- Directory search: slug/name only; no billing-status filter; no open-ticket badge
- No `lastLoginAt` / `lastPublicRegistrationAt` on tenant DTO; no plan-limit meters
- No operator membership list; no notify-operator on suspend or status change
- No global platform audit search; audit `actorUserId` is unreadable GUID
- No health strip (outbox, Stripe webhook lag, seed/demo flags)
- Complimentary has no expiry; archive restore UX thin
- **Catch-22:** locked-out operators cannot file tickets (must be logged in)

## Killed

- Impersonation / login-as-tenant
- Client PII export (directory aggregates only)
- Second web app / Docker service for ops
- Stripe writes from platform console
- Intercom / bidirectional Gmail integration
- Activity editing from platform; tenant CRM entry; tenant switcher on platform

## Locked next slice

Forge this sequence — packaging existing APIs, not greenfield:

1. **Tenant Snapshot** — `/platform` API + card on ticket detail and tenant detail (same DTO): plan, caps, last login, last registration, billing labels, owner email, seat list
2. **Operator Reply** — append-only thread visible in Settings; internal notes stay hidden; email filer on reply / `WaitingOnOperator`
3. **Recovery actions** — audited `SendPasswordReset` / `ResendVerify` on tenant members (trigger same emails, never set passwords)
4. **Create-tenant UI** — form in directory wrapping existing `POST`
5. **Omni-search** — one box: slug, operator email, SUP number, Stripe customer id (directory + inbox)
6. **Findability** — omni-search + filters; Support nav open-count badge (forge: directory stays `/platform` home)

**Then (not first):** public cannot-sign-in intake (after recovery exists), complimentary expiry, dormancy idle days, health strip, global audit search, hide load-test/demo default, billing-status filter.

Forge supersedes: do **not** change default landing to Support; public cannot-sign-in is deferred (abuse). See `_bmad-output/forge/platform-ops-support-console/forged-idea.md`.

## Constraints

| Constraint | Rule |
|------------|------|
| **FR-7** | No impersonation — snapshot + audited recovery only |
| **UX-DR16** | Sparse ops UI — one snapshot card per screen, not a dashboard of charts |
| **Directory** | No PII export — counts, caps, last-activity timestamps only |
| **Suspend** | Abuse / ToS / freeze only — not collections; billing is read-only dials |
| **APIs** | `PlatformAdminOnly` endpoints as approved EF bypasses; no `tenant_id` on platform JWT → no `/admin/*` |
| **App model** | One Next app, two login doors; ops stays in `/platform/*` |
| **Gmail** | Match-by-SUP; do not store credentials or rebuild email client |
| **Roles** | Mutually exclusive; dual-login testing = separate browser profile |

## Assets to reuse

- `adminContactEmail` on tenant list → mailto + ticket compose
- `WaitingOnOperator` copy already says "Waiting on you"
- Complimentary / archive / suspend APIs exist
- Operator ticket attachments = consented PII boundary

## Downstream

`bmad-forge-idea` → `bmad-spec` → `bmad-prd` (update intent) on locked slice above.
