# Investigation: Story 43.2 Team and permissions

## Hand-off Brief

1. **What happened.** Original 43.2 predates 38.5/38.6/39.3/39.4/43.1. Current HEAD already has nested `/settings/team`, Member copy+replace, Basic UpgradePanel, seat-cap banner, AlertDialog remove/revoke, and local Member fixtures.
2. **Where the case stands.** Remaining delta is presentation consistency: ProductErrorState for role denial, specific dialog labels, 390 touch targets, mapped API error codes, and tests. No RBAC or seeder work.
3. **What's needed next.** Party + spec on the smallest remaining change; do not reopen Settings routing.

## Case Info

| Field | Value |
| ----- | ----- |
| Ticket | 43.2 |
| Date opened | 2026-10-06 |
| Status | Concluded |
| System | Cohestra main `e4bb77c6` |
| Evidence sources | Team UI, TeamController, TeamInviteService, 38.6 AlertDialog, ProductErrorState, e2e fixtures |

## Problem Statement

Operators cannot immediately tell whether Team is unavailable because of ROLE, PLAN, or SEAT CAP; destructive actions need accessible confirmation; QA needs a local Member fixture without a production seeder.

## Evidence Inventory

| Source | Status | Notes |
| ------ | ------ | ----- |
| `settings-team-page-content.tsx` | Available | Deny p + replace; UpgradePanel; seat banner; Yes/No dialogs |
| `TeamController.cs` | Available | TenantAdminOnly; plan_locked; seat_cap_reached; last-admin; self-remove |
| `ProductErrorState` | Available | Used by Campaigns gate; unused by Team |
| `E2eEntitlementFixtureSeeder` | Available | Local `px2-pro-member@cohestra.local` |
| Production Member seeder | Missing (good) | OperatorSeeder is Admin-only |

## Delta audit vs original 43.2

| Original concern | Class | Evidence |
| ---------------- | ----- | -------- |
| Nested `/settings/team` | ALREADY SATISFIED | 43.1 |
| Member copy + replace | ALREADY SATISFIED | 43.1 contract; preserve |
| Basic UpgradePanel | ALREADY SATISFIED | `invitesAllowed === false` |
| Seat-cap banner + revoke/remove/upgrade | ALREADY SATISFIED | `settings-team-page-content.tsx:148-161` |
| AlertDialog (not `window.confirm`) | ALREADY SATISFIED | 38.6 overlay |
| Focus trap | ALREADY SATISFIED | `alert-dialog.tsx` |
| Server TenantAdminOnly 403 | ALREADY SATISFIED | TeamController + TenantAuthzIntegrationTests |
| Self-removal forbidden | ALREADY SATISFIED | UI hide + API 400 |
| Last-admin server rule | ALREADY SATISFIED | 409 `member_remove_conflict` |
| Pending invites reserve seats | ALREADY SATISFIED | seatsUsed = members + pending |
| No table (stacked lists) | ALREADY SATISFIED | ul/li |
| Local Member fixture | ALREADY SATISFIED | E2eEntitlementFixtureSeeder; document only |
| Production seeder | OBSOLETE if we do not add one | Must stay absent |
| Shared denied primitive | PARTIALLY SATISFIED | ProductErrorState exists; Team uses inline `<p>` |
| Denied page owns h1 | OBSOLETE / SUPERSEDED | 38.5/39.4/43.1: layout h1 is Team; deny body is h2 |
| Dialog labels Yes/No | STILL MISSING | Need Remove member / Revoke invite / Cancel |
| 390 44px Remove/Revoke | STILL MISSING | `size="sm"` is h-7 |
| 390 invite e2e | STILL MISSING | No Team 390 invite test |
| Distinct API error copy | PARTIALLY SATISFIED | Codes exist; UI shows raw detail |
| Empty additional-members copy | PARTIALLY SATISFIED | Pending empty exists; members empty is blank ul |
| Invite token env-blocked | PARTIALLY TESTABLE | NullEmailSender / FakeEmailSender; invite still persists |
| Copy-link / resend | NOT a current product surface | Do not invent |
| New roles / impersonation | NON-GOAL | Do not add |

## Confirmed Findings

### Finding 1: Three states already exist but denial is visually weak

Role denial is a sentence + redirect. Plan lock is UpgradePanel. Seat cap is an amber status with revoke/remove/upgrade. Member never sees UpgradePanel (39.3 e2e).

### Finding 2: Server remains authoritative

Member JWT cannot list/invite/remove/revoke (403). Frontend hiding is not security.

### Finding 3: Destructive dialogs exist but use Yes/No

Titles are specific; actions are not.

## Conclusion

**Confidence:** High

Smallest remaining 43.2: reuse ProductErrorState for role denial (keep 43.1 replace), specific dialog verbs, 390 touch targets, map `plan_locked` / `seat_cap_reached` / `member_remove_conflict`, add tests. Do not change RBAC, Paddle, Billing presentation, or add a production seeder.

## Recommended Next Steps

Party → spec → implement that delta only.
