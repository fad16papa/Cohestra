---
phase: uat-polish
status: in-progress
last_updated: 2026-06-30
baseline: epic-7 done
baseline_commit: 40d52bf
uat_sentence: "I could hand this to my team tomorrow."
---

# UAT Polish — Implementation Log

Ad-hoc frontend + minimal backend work after Epic 7, before DigitalOcean UAT handoff. Not formal Epic 8 stories; tracked here for BMad continuity.

## Completed

| ID | Deliverable | Artifact / paths | Notes |
|----|-------------|------------------|-------|
| UAT-UI-1 | Spacious dashboard wireframe | `web/components/dashboard/*`, `ui-modernization-dashboard-clients.md` | Greeting, quick actions, metrics, performers, recent campaigns |
| UAT-UI-2 | Clients card-row modernization | `web/components/clients/client-row.tsx`, shared table layout | Avatars, hover lift, status alignment |
| UAT-UI-3 | Nav active state polish | `web/components/layouts/admin-nav-links.tsx` | Left border + tint |
| UAT-UI-4 | Client profile multi-activity UX | `client-registration-history.tsx`, `client-profile-multi-activity-ux.md` | Master/detail registration list; full-width stack |
| UAT-UI-5 | Operator brand accent (Settings) | `BrandAccentColor`, `brand-accent-sync.tsx`, `brand-accent-section.tsx` | Accent tier only; admin routes scoped |
| UAT-FORM-1 | Phone field `phoneCountry` | `phone-field-country-form-schema.md`, schema v1 contract | Operator picks country in form editor |
| UAT-FORM-2 | SG default for phone fields | `phone-countries.ts`, `PhoneCountrySupport.cs` | Missing `phoneCountry` → Singapore (+65) |
| UAT-DEPLOY-1 | DO UAT Docker + docs | `docker-compose.uat.yml`, `docs/deploy/*` | SendGrid prod validation, initial bootstrap |
| UAT-DEPLOY-2 | Docker nginx entry point | `deploy/nginx/app.conf`, `docker-compose.yml`, `docker-compose.uat.yml` | Same routing local + prod; web/api internal only |
| UAT-DEPLOY-3 | GitHub Actions CD | `.github/workflows/deploy.yml`, `deploy/remote-deploy.sh`, `docs/deploy/github-actions-cd.md` | SSH deploy on `main` after CI |
| UAT-DEPLOY-4 | Temporary HTTPS (nip.io) | `deploy/setup-temporary-https.sh`, `app-ssl.conf.template`, `docs/deploy/temporary-https-nipio.md` | Let's Encrypt without client domain; safe rollback |
| UAT-AUTH-1 | Operator self-service onboarding | `AuthController`, `AuthService`, register/verify/forgot/reset flows | Email OTP; single operator enforced |
| UAT-FIX-1 | SendGrid checklist false alarms | `EmailDeliveryStatusService.cs` | Domain auth + API permissions |
| UAT-FIX-2 | Campaign delivered/failed icons | `campaigns-list-page.tsx` | Green ✓ / red ✗ |
| UAT-FIX-3 | Clients recent-registration filter + dedup copy | `spec-clients-recent-registrations-filter.md` | Dashboard tile + metric use `registeredWithinDays`; list explains dedup |
| UAT-FIX-4 | Activity registrations tab name snapshot | `RegistrationRegistrantDisplayName.cs` | List uses answer snapshot, not live `Client.FullName` |
| UAT-FIX-5 | Hero image URLs (public + email) | `ActivityHeroImageUrlResolver.cs`, `activity-branding-panel.tsx`, `RegistrationConfirmationEmailBuilder.cs` | Rewrite localhost/asset paths via `PUBLIC_BASE_URL`; upload in branding panel |
| UAT-FIX-6 | OTP SendGrid failure surfacing | `AuthService.cs` | Check `EmailSendResult.Success`; no silent OTP drop |
| UAT-FIX-7 | HTTP public compat (pre-HTTPS) | `web/lib/clipboard.ts`, `idempotency-key.ts`, `api.ts` | Copy link + submit on raw IP HTTP; origin fallback for API URL |
| UAT-REG-1 | Registration numbers | `registration-numbers-and-demo-seed-v2.md` | `REG`+`YYYYMMDD`+6 digits; success screen; admin + CSV; duplicate block |
| UAT-SEED-1 | Demo seed v2 | `DemoDataSeeder.cs` | Full business wipe on startup; 6×10×100×6000 matrix |
| UAT-UI-6 | Activity list registration counts | `ActivityResponse.registrationCount`, `activity-card.tsx` | Was hardcoded 0; now from API |
| UAT-UI-7 | Confirm modals (AlertDialog) | `alert-dialog.tsx`, publish/form/campaign flows | Replaces `window.confirm` |
| UAT-UI-8 | Archive/delete guard modals | `archive-activity-dialog.tsx`, `delete-catalog-item-dialog.tsx` | Published schedule warnings; blocked delete UX |
| UAT-FORM-3 | Form field drag reorder | `form-field-editor.tsx`, `reorderFields()` | Grip + arrows; selection tracking fix |
| UAT-FORM-4 | Form tab layout | `activity-form-tab.tsx` | Order + properties side-by-side; preview full width below |
| UAT-UI-9 | Toast + theme polish | `toast-provider.tsx`, theme sync files | Top-right toast; theme toggle without accent flash |
| UAT-UI-10 | Reports ranking scroll | `report-results.tsx` | ~5 visible rows + scroll hint |
| UAT-UI-11 | Activity card created date/time | `activity-card.tsx` | Shows activity `createdAt` on list cards |
| UAT-CAMP-1 | Additional campaign recipients | `additional-recipients-picker.tsx` | Compose beyond segment selection |

## In progress / verify on UAT

- [ ] Run `bash deploy/setup-temporary-https.sh` on droplet; share `https://129-212-235-2.nip.io/` with client
- [ ] GitHub Actions secrets: `DROPLET_HOST`, `DROPLET_USER`, `DROPLET_SSH_KEY`
- [ ] Run `docs/deploy/uat-polish-checklist.md` end-to-end on droplet (HTTPS URL)
- [ ] Confirm demo seed logs 6000 registrations after API restart (`DemoDataSeed__Enabled=true`)
- [ ] Public register flow under HTTPS: success shows registration ID; duplicate shows message **without** ID
- [ ] Copy registration link + OTP email on HTTPS (verify SendGrid delivered)
- [ ] Operator walkthrough: dashboard 10s story, one-step actions, scannable status
- [ ] Re-save legacy activities' forms if placeholder still shows `+63` in DB (optional; runtime defaults SG)

## Deferred (post-UAT / Epic 8)

- Campaign card grid, registration wizard, illustrated empty states
- Sidebar collapse overhaul, activity feed (no API)
- Org-wide default brand accent
- Full libphonenumber validation for all countries
- E2E tests for phone country + brand accent + auth OTP flows
- Client domain TLS cutover (script ready: `deploy/switch-https-domain.sh`)

## Test evidence

- `Infrastructure.Tests`: 60+ passing (registration numbers, demo seed v2, filters, dedup, hero URL resolver)
- `web`: `npm run build` passing
- Migration: `20260627101516_AddRegistrationNumber`, `20260628150401_AddOperatorNickname`
- Droplet smoke: stack healthy on `http://129.212.235.2` (pre-HTTPS verify)
