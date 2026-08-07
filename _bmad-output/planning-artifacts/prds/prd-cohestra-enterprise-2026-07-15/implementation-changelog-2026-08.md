# Cohestra Enterprise — Implementation Changelog (August 2026)

**Purpose:** Trace shipped code back to PRD functional requirements. Use when updating `prd.md`, epics, UX specs, and launch checklists.

**Baseline:** Platform 0 (Epics 1–10) + Enterprise Epics 11–19 on `main` as of 2026-08-07.

---

## Summary

| Area | PRD | Shipped | PR(s) |
|------|-----|---------|-------|
| Transactional email outbox | FR-28 | 2026-08 | #85 |
| Operator dashboard modernization | FR-15 | 2026-08-07 | #86, #88, #89 |
| Activities list UX (cards, 20/page) | FR-14 | 2026-08-07 | #90 → #91 |
| Plan limit enforcement + UI warnings | FR-27 | 2026-08-07 | #92 |
| Per-activity max registrants | FR-14 (Epic 20) | 2026-08-02 | (prior merge) |
| Apex marketing landing on bare localhost | FR-11 | 2026-08 | `a57037a` |

---

## FR-28 — Transactional outbox (#85)

**What shipped**
- `OutboxMessages` table — tenant-scoped; written in the same DB transaction as registration, billing, and campaign mutations.
- `OutboxPublisher` + typed handlers (`RegistrationConfirmation`, `BillingNotification`, `CampaignRecipient`).
- Background dispatcher with claim lease and idempotent dedupe index.
- Async campaign sends return **202 Accepted** + poll URL.
- Registration confirmation enqueued when the public form includes an email field.

**Key paths**
- `src/Infrastructure/Outbox/`
- `src/Infrastructure/Registrations/RegistrationService.cs` (enqueue on success)

**Tests**
- `src/Infrastructure.Tests/Outbox/OutboxPublisherTests.cs`

---

## FR-15 — Dashboard modernization (#86, #88, #89)

**What shipped**
- Three switchable views on `/dashboard`: **Overview · Graphs · Tables** (localStorage persistence).
- Extended `GET /api/v1/admin/dashboard/metrics`:
  - `registrationsTrend` (30-day daily series)
  - `registrationsInPeriod` / `registrationsInPreviousPeriod` (WoW delta chips)
  - `leadStatusBreakdown` (new / contacted / active / inactive)
  - Existing KPIs + `activityPerformance`, `followUpCoveragePercent`
- Recharts-based components: registrations trend area chart, activity performance bar chart, lead pipeline donut.
- Lead Pipeline **stacked layout** in Graphs view: large donut on top, compact status rows below (#89).
- Tables view: sortable metrics, bounded-scroll activity performance table, drill-down links.
- 60s metrics polling with subtle refresh animation on KPI tiles.

**Key paths**
- `web/components/dashboard/`
- `web/lib/dashboard-api.ts`
- `src/Infrastructure/Dashboard/` (metrics computation)

---

## FR-14 — Activities list + capacity

### Activities list (#90 → #91)

**Decision:** Table experiment (#90) **reverted** (#91). Ratified UX is **card grid**, not a data table.

**What shipped (final)**
- Card grid on `/activities` — name, community, category, schedule, location, registration count, status, created date.
- **20 activities per page** (server-side pagination).
- Filters (status, community, category, search) reset to page 1; debounced server-side search.
- Schedule conflict indicator on cards when overlapping published activities are detected.
- Entire card links to `/activities/{id}`.

**Key paths**
- `web/components/activities/activities-list-page.tsx` (`ACTIVITY_PAGE_SIZE = 20`)
- `web/components/activities/use-activity-schedule-conflicts.ts`
- `web/lib/activity-calendar-utils.ts`

### Activity create / publish process

- New activities always created as **Draft** (API rejects direct Published/Archived create).
- **Plan limit warnings** on create form and activities list when published-activity or monthly-registration dials are at capacity (FR-27); draft save remains allowed.

### Epic 20 — Max registrants (prior)

- Optional `MaxRegistrants` per activity.
- Public registration returns `409 activity_full` when full.
- Activity cap cannot exceed tenant plan registrations/month limit at save time.

---

## FR-27 — Plan limit enforcement (#92)

**What shipped**

| Limit dial | Warn | Block | Enforcement |
|------------|------|-------|-------------|
| Team seats | ≥80% | **Over** capacity (not at exact cap) | Invite disabled |
| Communities | ≥80% | ≥100% | Create API 400; form disabled + `PlanLimitAlert` |
| Published activities | ≥80% | ≥100% | Publish API 400; publish button disabled |
| Registrations / month (UTC) | ≥80% | ≥100% | Public register API 409 `plan_registration_limit` |

**Backend**
- `TenantPlanLimitValidator` — shared capacity math for communities, publish, registrations.
- `TenantAccessService` — over-limit workspace after downgrade (`ReadOnly_OverLimit`).
- `ActivityService`, `CommunityService`, `RegistrationService` call validator at mutation time.

**Frontend**
- `web/lib/plan-limit-utils.ts`
- `web/components/shell/plan-limit-alert.tsx`
- Warnings on: create activity, publish controls, communities page, activities list.
- Public registration form handles `plan_registration_limit` with friendly copy.

**Tests**
- `src/Infrastructure.Tests/Tenants/TenantPlanLimitValidatorTests.cs`

---

## FR-11 — Marketing apex on localhost (`a57037a`)

- Removed `DEV_TENANT_SLUG` from the web container default env so bare `localhost` serves the **marketing landing**, not a tenant stub.
- Local tenant testing: use `{slug}.localhost` hosts entries or explicit env override documented in addendum.

---

## Process updates (operator workflows)

| Workflow | Before | After (2026-08-07) |
|----------|--------|---------------------|
| View pipeline health | KPI tiles only | Overview / Graphs / Tables views with trend + lead status charts |
| Browse activities | Card grid (Platform 0) | Card grid retained; **20/page**; schedule conflict badges |
| Create activity at published cap | Could publish over cap | Draft allowed; publish blocked with `PlanLimitAlert` |
| Public registration at monthly cap | Could exceed plan | Blocked with `409 plan_registration_limit` + UI message |
| Registration email | Inline / best-effort | Transactional outbox — commit + enqueue atomically |
| Pro campaign send | Sync risk | 202 + outbox dispatch |

---

## Documentation sync checklist

When this changelog changes, update:

- [x] `prd.md` — FR-14, FR-15, FR-27, FR-28, §6.1, §13.4, assumptions
- [x] `addendum.md` — dashboard API, outbox, plan enforcement, local dev
- [x] `epics-cohestra-enterprise.md` — FR-27/28 mapping, Epic 22–23
- [x] `ux-cohestra-2026-07-18/EXPERIENCE.md` — dashboard views, activities list, limit alerts

---

## Out of scope (still deferred)

- Activities **table** view (experiment reverted)
- Waitlist (Epic 20 note)
- Viber client touch-base (Epic 21 — in progress / parked stories)
- CSP enforce mode, httpOnly sessions
