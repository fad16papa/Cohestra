
## Deferred from: code review of 12-2-jwt-tenant-id-and-tenant-scoped-login.md (2026-07-21)

- Access-token path does not re-validate TenantMembership each request — refresh rechecks; continuous revoke needs shorter TTL or Epic 13 context
- Legacy Redis refresh values (plain Guid) rebind tenant from Host on refresh — rollout-only; new sessions store tenantId JSON
- `DEV_TENANT_SLUG` / Tenancy:DevTenantSlug can remap apex/localhost in shared config — ops/deploy documentation

## Deferred from: code review re-review of 12-1-tenantmembership-and-remove-single-operator-gate.md (2026-07-21)

- Backfill skips existing `(UserId, default)` pair ignoring Role — rare TenantMember-under-TenantAdmin Identity; harden in 12.3/ops if seen
- Residual auth guard tests for verify-after-close / resume-after-close / refresh-orphan-before-consume — **resolved** in AuthServiceMembershipGuardTests with residual patches

## Deferred from: code review of 12-1-tenantmembership-and-remove-single-operator-gate.md (2026-07-21)

- Concurrent bootstrap register TOCTOU (check DefaultTenantHasTenantAdmin then create) — no advisory lock; low-traffic first-bootstrap path
- No FK from `TenantMembership.UserId` to Identity users — matches loose Identity coupling; harden if invites need cascade
- Backfill `SaveChanges` without unique-violation catch — rare seeder race with concurrent register Ensure
- App auth before default tenant row exists — backfill warns and skips; TenantAdmins cannot get tokens until tenant+backfill
- `CreateMembership` does not verify user exists — sufficient for register/seed; invite flows (14.x) should validate

## Deferred from: code review of 11-5-complimentary-sponsored-tenant-flag (2026-07-21)

- Archive races with complimentary mutation — optimistic concurrency already deferred from 11.3; low-traffic platform admin path
- DelinquencyStartedAt not cleared when forcing BillingStatus=Free on complimentary set — FR-23 jobs not implemented yet; IsComplimentary is the skip signal for future jobs
- Integration complimentary coverage is SkippableFact when Postgres/Redis unavailable — same pattern as 11.3/11.4; exercise live when stack is up

## Deferred from: post-patch re-review of 11-4-platform-tenant-directory-and-health (2026-07-21)

- Role exclusivity TOCTOU / no transactional AddToRole — residual concurrency edge
- AuthService register exclusivity rarely hit (email unique before check) — seeders cover real collision
- JWT multi-claim same-key JSON.parse collapse — exclusive-role world makes single role typical
- Broader RoleExclusivity integration coverage on seeders — residual test gap
- DeleteAsync failure after refused assign leaves orphan user — rare

## Deferred from: code review of 11-4-platform-tenant-directory-and-health (2026-07-21)

- EF `ToLower().Contains` search may be non-sargable at scale — residual perf; fine for Platform Admin directory volume
- Integration coverage thin (no anonymous 401 on platform GETs; no `/ready` unhealthy when default missing) — residual test gaps; SkippableFact pattern same as 11.3
- `/ready` Unhealthy description names default tenant — intentional ops signal on anonymous readiness
- Reactivate has no confirm dialog — UX polish; Suspend already requires reason; Archive uses confirm
- `PlatformMeController` roles from JWT claims — matches existing `AdminController` pattern

## Deferred from: code review of 11-3-platform-admin-provision-suspend-reactivate-archive (2026-07-20)

- Append-only audit enforcement (DB triggers / no-update interceptor) — documentation + no update API for now; harden later if compliance requires
- Concurrent PlatformAdminSeeder race on duplicate user create — same pattern as OperatorSeeder
- Optimistic concurrency on Tenant status transitions — low-traffic platform admin path
- Integration tests are SkippableFact when Postgres/Redis `/ready` unavailable — exercise AC5 live when stack is up
- Stricter email RFC validation beyond `MailAddress` for AdminContactEmail — v1 contact field; FR-1 signup can harden later

## Deferred from: post-patch re-review of 11-3 (2026-07-20)

- (see above email deferral)

## Deferred from: code review of 11-2-default-tenant-migration-and-tenantid-on-core-entities (2026-07-20) — Group B

- `Down()` does not delete the seeded `default` tenant row — safer than wipe; incomplete reverse of seed only
- No PostgreSQL test executes migration SQL (`ON CONFLICT`, defaults, FKs) — story allows InMemory model tests
- Model tests cover only Activity `(TenantId,Slug)` + SitePage unique `TenantId` — other tenant composites untested
- `Down()` recreating pre-tenant global unique indexes is unsafe if multi-tenant duplicate keys exist — Platform 0 rollback path only

## Deferred from: code review of 11-2-default-tenant-migration-and-tenantid-on-core-entities (2026-07-20) — Group A

- No parent/child `TenantId` alignment invariant (`CampaignRecipient`↔`Campaign`, `Registration`↔`Activity`/`Client`, `ClientTimelineEvent`↔`Client`) — Epic 13 filters / later integrity; Restrict FK alone allows cross-tenant graphs
- SitePage create still hardcodes `SingletonId` as row Id — Platform 0 continuity per story; multi-tenant SitePage create needs new Guids later
- `ApplyDefaultTenantIds` only via ChangeTracker — `ExecuteUpdate` / bulk / raw SQL can still persist empty `TenantId`
- Parent `TenantId` Modified does not sync dependent children — no tenant-move story yet

## Deferred from: code review of 11-1-tenant-entity-with-dual-status-dials (2026-07-20)

- Empty/whitespace slug format validation — FR-1 signup / Story 11.3 provisioning; uniqueness only in 11.1
- CreatedAt/UpdatedAt auto-stamp on Tenant insert — write path in 11.2/11.3; matches Activity entity pattern
- StripeCustomerId / StripeSubscriptionId unique indexes — Epic 14 billing reconciliation

## Deferred from: code review of 9-8-website-builder-polish (2026-07-07)

- No integration tests for `POST /api/v1/admin/site/apply-preset` or `revert-published` — optional CI stack; `SitePageSeedDocumentBuilderTests` cover preset document shape only

## Deferred from: code review of 9-7-seo-metadata-and-login-branding (2026-07-07)

- Login route ISR (1m revalidate) may serve stale branding/metadata briefly after site publish — acceptable MVP; force-dynamic if operators report lag
- Preview homepage `og:image` from draft when hero image set — extends preview-token defer from 9.4
- Legacy drafts with custom `poweredByLabel` still render until republish — editor removed per FR-20; no migration to reset label

## Deferred from: code review of 9-6-site-branding-and-activity-homepage-toggle (2026-07-07)

- No integration test for PATCH `/api/v1/admin/activities/{id}/show-on-homepage` — optional CI stack; resolver unit tests cover ShowOnHomepage filter
- No remove-logo control in website builder — replace-only upload; not required by AC-9.6.1

## Deferred from: code review of 9-5-website-builder-admin-ui (2026-07-07)

- Programmatic navigation (command palette `router.push`) bypasses unsaved guard — matches ActivityBrandingPanel pattern; project-wide router guard deferred
- Browser Back/Forward not guarded — no `popstate`/Next router blocker in web app
- Sign out bypasses unsaved guard — button not anchor
- Session-expiry redirect bypasses unsaved guard — auth layer behavior
- Client publish gate only validates first enabled hero section — invalid multi-hero data edge case; server rejects
- Stale `publishedActivities` after external unpublish — server publish gate catches on POST
- `fetchPublicUpcomingActivities` swallows errors — preview may omit upcoming cards silently
- Loading shows full-page skeleton instead of disabled editor + preview-only skeleton — UX polish, not AC fail
- Unsaved guard uses native `window.confirm` — consistent with Epic 5 defer pattern
- `GripVertical` icon implies drag reorder — keyboard/drag polish for Story 9.8

- Multi-tab website builder last-write-wins with no draft version conflict detection — MVP defer; reload-on-stale is future hardening

## Deferred from: code review of 9-4-public-homepage-runtime-render (2026-07-06)

- Preview token in query string (log exposure) — intentional per UX `/?preview=` flow; header/body token is future hardening
- Preview HMAC uses JWT signing key — architecture deferred dedicated secret
- Invalid preview token silent fallback to published/env — matches AC-9.4.3
- API outage/timeout treated like 404 for homepage fallback — no error UI required in AC
- Client-side authenticated redirect flash on `/` — pre-existing landing pattern
- Site logo from `logoAssetId` not rendered — Story 9.6
- No integration test for `GET /api/v1/public/site/preview` — optional CI stack

## Deferred from: code review of 9-3-site-page-seed-and-migration (2026-07-06)

- No integration test for startup seed → `GET /api/v1/public/site` 200 — optional per story Task 5; needs Postgres/Redis CI stack
- `DbUpdateException` concurrent-insert retry branch untestable with InMemory EF — defer Postgres integration or dedicated test double
- `PoweredByLabel` / `AccentColor` have no flat `LANDING_*` env fallback — AC-9.3.4 lists five vars only; docker uses `SiteLanding__*` literals

## Deferred from: code review of 9-2-public-site-api-and-redis-cache (2026-07-06)

- Upcoming activities returned when `upcomingActivities` section disabled — web render gating in Story 9.4; API uses default limit per AC 9.2.4
- No dedicated unit test for RedisPublishedSiteCache corrupt-json/TTL — integration test covers populate path; MVP defer pattern

## Deferred from: code review of 9-1-sitepage-entity-and-admin-api (2026-07-06)

- Integration tests skip without Postgres/Redis stack — pre-existing infra pattern; ensure CI runs integration category before merge
- AD-7 unknown JSON keys not rejected on PUT draft — deferred to builder UI / schema validator story; AC 9.1 only requires schema version check on PUT


- Communities/categories are label strings on activities, not FK relations — ad-hoc labels outside catalog still possible via API; formal FK model deferred
- Catalog rename propagates to activities in service layer — no DB constraint enforcing catalog membership
- No automated API/UI tests for communities, categories, or catalog pickers — Epic defer pattern
- ~~Activity list filters capped at 100 recently updated activities~~ — resolved in Story 7.4 (server search + pagination)
- ~~WhatsApp follow-up duplicate prevention is UI-only (dirty baseline)~~ — resolved in Story 7.5 (server 409 within 15-minute cooldown)
- ~~SendGrid delivery depends on operator domain/sender verification — not enforced in app beyond API error surfacing~~ — resolved in Story 7.6 (settings + campaigns checklist UI)
- Form field editor responsive layout not covered by E2E tests

## Deferred from: Epic 4 code review (2026-06-16)

- Many sequential DB queries per dashboard/report request — batch/cache if latency matters
- No API/integration/E2E tests for Epic 4 paths — consistent defer pattern
- Redis cache failure prevents dashboard metrics with no DB-only fallback — compose treats Redis as required
- CSV export loads all registration rows into memory — cap/stream if volume grows
- Mobile hides dashboard Updated time below sm breakpoint
- Dashboard rolling 7-day window vs reports calendar UTC presets — intentional split documented in stories 4.3/4.4

## Deferred from: code review of 4-5-report-filter-bar-and-report-ui (2026-06-16)

- Stale report shown while refetching after filter change — matches clients list pattern
- ~~Activity/community dropdown options capped at first 100 activities~~ — reports use catalog communities + `fetchAllActivities` (Story 7.4)
- Many sequential DB queries per filtered report — inherited from 4.4
- Lead status and referral filters use current client fields, not registration-time snapshot
- No API/UI tests for filter semantics or empty state — Epic defer pattern
- Report MetricTile links omit report filter context — not in AC; dashboard tiles use fixed deep links

## Deferred from: code review of 4-4-reports-aggregation-api (2026-06-16)

- Many sequential DB queries per report request — acceptable for MVP; batch or cache if reports slow
- Weekly/monthly presets use calendar UTC windows, not dashboard rolling 7-day window — intentional for FR-10
- inactiveClients is system-wide snapshot; follow-up cohort inactive count is period registrants only
- Follow-up status uses current lead status, not status at registration time
- No API/integration tests for preset ranges or reconciliation — Epic defer pattern

## Deferred from: code review of 4-3-activity-performance-ranking (2026-06-16)

- Period is fixed 7-day window — no dashboard period selector until reports/4.5
- Ranking returns all activities with registrations — no top-N cap
- Tie-break sorts by ActivityId GUID, not name
- Two-query ranking aggregation — acceptable at MVP scale
- No API/UI tests for ranking order or click-through — Epic defer pattern

## Deferred from: code review of 4-2-dashboard-metric-tile-ui-with-polling (2026-06-16)

- Polling continues on empty-state dashboard — harmless API noise
- Double 60s staleness window (API Redis cache + client poll) — acceptable per NFR-3
- Clients filter banners always clear all params via /clients — fine for tile deep links
- No E2E tests for polling or tile navigation — Epic defer pattern

## Deferred from: code review of 4-1-dashboard-metrics-api-with-redis-cache (2026-06-16)

- Four sequential COUNT queries on cache miss — combine when dashboard latency matters
- No index on clients.created_at for period filter — acceptable at MVP scale
- No API/integration tests for metrics aggregation or cache TTL — Epic 4 defer pattern
- Follow-up coverage uses LeadStatus != New only — WhatsApp timeline events extend in Epic 5

## Deferred from: code review of 3-10-activity-detail-registrations-tab (2026-06-16)

- Unbounded registration list — no pagination; acceptable for MVP until high-volume activities
- No API/integration tests for registrations endpoint — Epic 3 defer pattern
- Tab list lacks tabpanel/aria-controls wiring — pre-existing activity detail pattern

## Deferred from: code review of 3-9-merge-suspect-flag-banner (2026-06-16)

- Clients list rows do not surface merge-suspect flag outside filtered view — profile banner only; acceptable for MVP
- URL filter requires exact mergeSuspect=true (case-sensitive)
- No API/integration tests for mergeSuspect list filter — Epic 3 defer pattern

## Deferred from: code review of 3-8-client-relationship-timeline (2026-06-16)

- Timeline list keys for lead_status_changed events omit status transition — rely on occurredAt uniqueness
- Equal OccurredAt timestamps leave registration vs status event order undefined in merge sort
- Referral source extraction only reads referral_source field type — text-field referral answers omitted
- No tests for timeline projection or referral extraction — Epic 3 defer pattern

## Deferred from: code review of 3-7-client-profile-master-fields-and-lead-status (2026-06-16)

- UpdateLeadStatusAsync loads full registration + activity graph on every status PATCH — optimize with lighter read path if needed
- Answer keys outside activity form schema omitted from history when schema exists — legacy/migrated data edge case
- Duplicate lead status label maps in lead-status-badge.tsx and clients-api.ts — consolidate when touching badge styling
- No integration/unit tests asserting timeline event append on status change — consistent with Epic 3 defer pattern

## Deferred from: code review of 3-6-clients-list-with-client-row (2026-06-16)

- No loading indicator on sort/page refetch after first load — stale rows flash until fetch completes; matches activities list pattern
- Fetch errors do not clear previously loaded rows — error banner appears above stale data
- No integration/unit tests for ClientService list pagination/sort or controller validation — consistent with Epic 3 defer pattern
- EF list projection uses two correlated subqueries per row for last registration date vs activity name — optimize if list latency becomes an issue
- ClientsController BadRequestProblem duplicates ActivitiesController ProblemResult helper — style consistency only

## Deferred from: code review of 3-3-client-deduplication-logic (2026-06-16)

- No integration test asserting distinct Registration per deduped submit — covered by 3.1 flow; add with registration integration tests later
- Email-match + conflicting phone path untested — symmetric edge case; add test when patching cross-client logic

## Deferred from: code review of 3-2-public-registration-rate-limiting-and-idempotency (2026-06-16)

- All clients with unknown IP share one rate-limit bucket — edge case behind missing RemoteIpAddress
- X-Forwarded-For trusted without ForwardedHeaders middleware — production proxy hardening
- Idempotent replays still consume rate-limit quota — acceptable for MVP
- No integration tests for rate limit / idempotency paths — no test project yet

## Deferred from: code review of 3-1-client-entity-and-registration-ingestion-api (2026-06-16)

- Concurrent submits can create duplicate clients — no unique constraint on normalized contact; Story 3.3 dedup + DB constraints
- Phone-match update can overwrite email without merge-suspect flag — Story 3.3 FR-6
- No integration tests for registration ingestion path — no test project yet
- Web still accepts HTTP 202 for backward compat — remove after stub fully retired

## Deferred from: code review of 2-11-redis-cache-for-published-activities (2026-06-20)

- No TTL on cache keys — stale data persists if invalidation is missed; explicit invalidation sufficient for MVP
- No automated test proving cache hit vs PostgreSQL fallback — add with API integration test story

## Deferred from: code review of 2-10-stub-registration-endpoint (2026-06-17)

- Stub accepts unvalidated `answers` payload — Epic 3 schema validation
- OpenAPI `answers` schema is generic `object` without `additionalProperties` docs — contract markdown is canonical

## Deferred from: code review of 2-9-public-registration-page-shell-and-unavailable-states (2026-06-16)

- Stub POST accepts any answers without schema validation — Epic 3 / Story 2.10 contract hardening
- Client registration submit has no fetch timeout — consistent with scaffold API client pattern

## Deferred from: code review of 1-3-operator-identity-and-jwt-authentication (2026-06-17)
- No login/refresh rate limiting — NFR / future hardening story
- No logout or revoke-all-sessions endpoint — not in Story 1.3 AC; consume-on-refresh covers rotation
- Multiple concurrent refresh tokens per user — standard for MVP JWT refresh
- Refresh does not re-check password/security stamp — refresh-by-design uses Redis token only
- Operator seeder skips existing user (no password/role sync) — seed-once bootstrap pattern
- HTTP-only compose binding, Redis/Postgres without auth — local dev compose scope

## Deferred from: code review of 1-4-next-js-web-scaffold-with-shadcn-ui (2026-06-18)

- `NEXT_PUBLIC_*` build-time inlining for future client bundles — home page is SSR-heavy; document when adding client-side API calls
- Runtime JSON schema validation (zod) for `SystemInfo` — scaffold-only endpoint
- Web healthcheck does not verify API connectivity — compose `depends_on` api healthy is sufficient for scaffold
- Hard-fail startup when `API_URL` missing in Docker — compose always sets both vars today

## Deferred from: code review of stories 1-2 through 1-10 (2026-06-18)

- Client-side route guard only — admin HTML shell briefly reachable before redirect; architecture uses direct JWT in localStorage
- `authFetch` has no admin callers yet — session-expired toast on API 401 ships with Epic 2 admin API usage
- CORS `AllowedOrigins` hardcoded to localhost — production origin config deferred to deployment story

## Deferred from: code review of 2-1-activity-entity-and-admin-crud-api (2026-06-16)

- POST create accepts `status=published` without publish gate — Story 2.6 owns publish workflow
- Slug not regenerated when activity name changes — public URL stability; rename UX deferred
- AC-2.1.1 archived activities cannot accept registrations — enforcement ships with Epic 2/3 public registration endpoints

## Deferred from: code review of 2-2-activity-list-and-create-wizard-ui (2026-06-16)

- Registration counts hardcoded to 0 on ActivityCard — Epic 3 ingestion not built yet

## Deferred from: code review of 1-11-empty-dashboard-and-settings-appearance (2026-06-16)

- Dashboard shows API error when activities fetch fails — no empty-state fallback on transient API errors
- Migration `ThemePreference` default empty string for existing rows — normalized to `system` at read time
- Dev notes stale re dashboard always empty until Epic 2 — Story 2.2 wires activity count gate

## Deferred from: code review of Story 2.7 (2026-06-16)

- Published activities can save a form schema that fails publish gate — post-publish edit policy deferred
- No automated tests for PublishGateValidator — add with API test matrix story

## Deferred from: code review re-run of stories 2-4 and 2-5 (2026-06-16)

- Client validation omits empty labels and select/referral option rules — API rejects on save; expand client checks in a future hardening pass

## Deferred from: code review of stories 2-4 and 2-5 (2026-06-16)

- Tab list missing `tabpanel` / `aria-controls` wiring on activity detail — a11y polish, not in story AC

## Deferred from: code review of 2-3-form-schema-storage-and-field-type-contract (2026-06-16)

- Activity list responses include full formSchema per item — trim or lazy-load if payloads grow
- No automated API tests for form-schema validation matrix — add with Story 2.4 editor
- Corrupt JSONB in form_schema throws on EF deserialize — operational/data-migration concern
- Redis cache invalidation on schema save — Story 2.11

## Deferred from: Epic 5 code review (2026-06-16)

- ~~No CI workflow wiring SendGrid sandbox gate~~ — resolved in Story 7.2 (`.github/workflows/ci.yml`)
- Synchronous sequential campaign send loop — acceptable MVP scale
- Send-then-save without transaction on campaign blast — rare SaveChanges failure edge case
- No campaign send idempotency key — double-submit risk at MVP scale
- Dashboard metrics cache not invalidated on outreach events — 60s TTL matches Epic 4
- Native window.confirm vs in-app dialog — functional MVP UX
- Zero automated tests for CampaignService/ClientSegmentService — Epic defer pattern
- SendGrid sandbox 2xx treated as delivered — expected until production DNS
- Failed email attempts omitted from client timeline — visible in campaign detail API
- ~~WhatsApp phone +63 normalization parity~~ — superseded by UAT-FORM-1/2 (`phoneCountry` + SG default); explicit PH still supported
- Duplicate WhatsApp initiation timeline events — low audit noise

## UAT polish session (2026-06-16) — resolved

- Dashboard + clients UI modernization (Spacious layout) — `uat-ui-dashboard-clients`
- Client profile registration history master/detail — `uat-ui-client-profile-multi-activity`
- Operator brand accent in Settings — `uat-settings-brand-accent`
- Phone field country + Singapore default — `uat-form-phone-country-sg`
- SendGrid delivery checklist accuracy — `EmailDeliveryStatusService`
- DigitalOcean UAT deploy artifacts — `docs/deploy/`

## UAT polish session (2026-06-30) — resolved

- Docker nginx as public entry (local + UAT parity) — `uat-deploy-nginx-docker`
- GitHub Actions SSH deploy pipeline — `uat-deploy-github-actions-cd`
- Temporary HTTPS via nip.io + Certbot — `uat-deploy-temporary-https` (run script on droplet to activate)
- Operator self-service register / verify / forgot-password — `uat-auth-operator-self-service`
- Hero image URL rewrite + branding upload — `uat-fix-hero-image-urls`
- OTP SendGrid success check — `uat-fix-otp-sendgrid`
- HTTP fallbacks for clipboard, idempotency key, API origin — `uat-fix-http-public-compat` (superseded once HTTPS live)
- Activity list created date/time — `uat-ui-activity-created-datetime`

## UAT polish — still open

- Run `deploy/setup-temporary-https.sh` on droplet and sign off checklist with HTTPS URL
- Configure GitHub Actions deploy secrets and verify CD push
- Full UAT checklist sign-off — `docs/deploy/uat-polish-checklist.md`
- Epic 7 retrospective optional — can run after UAT window
- Party-mode follow-ups: campaign cards grid, registration wizard, empty-state illustrations
