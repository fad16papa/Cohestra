# ATDD — Story 43.2 Team and permissions

Murat / bmad-testarch-atdd  
Date: 2026-10-06

## Fixtures

- TenantAdmin eligible: operator / Pro or Core admin
- TenantMember: `PX2_PRO_MEMBER` (local seeder)
- Basic Admin: `PX2_BASIC_TENANT`
- Isolated integration tenants via platform create (no production seeder)
- Email: FakeEmailSender / NullEmailSender only

## Required cases

| ID | Case | Expected |
| -- | ---- | -------- |
| T1 | Admin eligible `/settings/team` | h1 Team; members list; invite form |
| T2 | Member `/settings/team` | ProductErrorState + tenant admins only; no UpgradePanel; 43.1 replace |
| T3 | Basic Admin `/settings/team` | UpgradePanel; no invite form |
| T4 | GET `/api/v1/admin/team` Member | 403 |
| T5 | POST invite Member | 403 |
| T6 | POST invite Basic Admin | 403 `plan_locked` |
| T7 | POST invite at cap | 409 `seat_cap_reached` |
| T8 | POST invite invalid email | 400 |
| T9 | Eligible invite | 204; pending listed; no real SMTP |
| T10 | Revoke pending | 204; invite gone; seat freed |
| T11 | Remove other member | 204 after dialog confirm |
| T12 | Self-remove API | 400 |
| T13 | Dialog a11y | Cancel / Remove member or Revoke invite; trap |
| T14 | 390 | stacked; controls ≥44px; no overflow |
| T15 | Tenant A cannot mutate Tenant B team | 404/403 |
| T16 | `/settings/team` deep link + refresh | still Team for Admin |
| T17 | Member nav | Team hidden |

## Out of scope

43.3 Billing presentation, production email delivery, new roles.
