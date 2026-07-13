---
status: done
completed: 2026-06-27
baseline: uat-polish
---

# Registration Numbers & Demo Seed v2

## Summary

Participant-facing **registration numbers** for check-in and validation, duplicate registration blocking, and a rebuilt **demo data seeder** that wipes business data and loads a realistic matrix for UAT.

## Registration number

| Rule | Implementation |
|------|----------------|
| Format | `REG` + `YYYYMMDD` (UTC) + 6-digit daily sequence — e.g. `REG20260627006001` |
| Scope | One unique number per **Registration** row (one per client per activity) |
| Generation | `RegistrationNumberGenerator` on public submit; unique DB index |
| Duplicate submit | Same client + same activity → **409 Conflict** (no ID in user-facing error text) |
| Public success | Shown on registration confirmation screen with copy button |
| Admin | Activity registrations tab, client registration history, reports CSV export |
| Internal | `registrationId` (UUID) retained for API/idempotency |

## Demo seed v2

When `DemoDataSeed:Enabled` is `true`, **every API startup**:

1. Wipes all business data (clients, registrations, activities, communities, categories, campaigns, templates, timeline)
2. Preserves operator account
3. Reseeds:

| Entity | Count |
|--------|-------|
| Communities | 6 |
| Activities | 60 (10 per community, published) |
| Clients | 100 |
| Registrations | 6,000 (each client × each activity) |

Settings: `CommunityCount`, `ActivitiesPerCommunity`, `ClientCount` in `DemoDataSeed` section.

## Key paths

- `src/Domain/Registrations/Registration.cs` — `RegistrationNumber`
- `src/Infrastructure/Registrations/RegistrationNumberGenerator.cs`
- `src/Infrastructure/Registrations/RegistrationService.cs` — generate + duplicate guard
- `src/Infrastructure/Seed/DemoDataSeeder.cs` — `WipeBusinessDataAsync`
- Migration `20260627101516_AddRegistrationNumber`
- `docs/contracts/public-registration-v1.md` — `registrationNumber` on 201
- `web/components/registration/registration-success-screen.tsx`

## Test evidence

- `RegistrationNumberGeneratorTests`, `DemoDataSeederTests` (6000 registrations, unique numbers)
- `PublicRegistrationIntegrationTests` — asserts number format
- `PublicRegistrationDuplicateIntegrationTests` — 409 on second submit
- `Infrastructure.Tests`: 60 passing
- `web`: `npm run build` passing

## Related UAT polish (same session)

- Activity list **registration count** wired from API (`ActivityResponse.registrationCount`)
- AlertDialog replaces `window.confirm` (unpublish, apply template, send campaign)
- Form field drag-and-drop reorder + up/down arrows
- Archive/delete catalog confirmation modals, toast/theme polish (see `uat-polish-implementation-log.md`)
