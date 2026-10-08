# Proposal: Platform Production Operations & Support Center

**Status:** Awaiting owner approval — no implementation  
**HEAD audited:** `main` `69814fc3` (2026-10-08)  
**Skills:** `bmad-investigate` (concluded) · `bmad-party-mode` (trade-off lock)  
**Next after approval:** `bmad-create-epics-and-stories` for **Epic 44** (number unused on tracker)

Do not run create-story / dev-story until this proposal is accepted.

Related: `_bmad-output/implementation-artifacts/investigations/platform-admin-production-support-investigation.md`

---

## 1. Verified current Platform Admin capability inventory

Identity plane (Confirmed): `/platform/login` on marketing apex; home `/platform`; JWT `platform_admin=true`; policy `PlatformAdminOnly` rejects tenant_id / membership role (`TenantAuthorizationExtensions.cs:32-61`). One web app, two doors (`README.md:64-76`).

| Surface | Status | Evidence |
| ------- | ------ | -------- |
| Platform login + route guard | EXISTING | `web/app/platform/login/page.tsx`; `platform-route-guard.tsx`; tenant host 307 via `platform-ops-host.ts` |
| Tenant directory (search, filters, pagination, create) | EXISTING | `GET/POST /api/v1/platform/tenants`; `web/app/(platform)/platform/page.tsx` |
| Omni-search tenants + issues | EXISTING | `GET /api/v1/platform/search`; cap 20+20 |
| Tenant lifecycle (create/suspend/reactivate/archive) | EXISTING | Epic 11.3; `PlatformTenantsController.cs:65-152`; Suspend ≠ collections |
| Complimentary / sponsored | EXISTING | Epic 11.5; Paddle IDs left unchanged |
| Per-tenant snapshot (plan meters, last activity, open issues, members) | EXISTING | Epic 28; `GET .../tenants/{id}/snapshot`; `PlatformOpsContracts.cs:15-30` |
| Members list + password reset + resend verification | EXISTING | `PlatformOpsController.cs:38-102`; AlertDialog in 43.4 |
| Support inbox, detail, reply, attachments, open-count badge, volume report+CSV | EXISTING | Epics 26–27 + 28 replies; `web/app/(platform)/platform/support/**` |
| Recent per-tenant audits | PARTIAL | `TenantDetailResponse.RecentAudits` only; no global search |
| Staff-console UX / a11y / 1440 & 390 | EXISTING | Story 43.4 frozen; `web/e2e/platform-admin-43-4.spec.ts`; `--plat-*` aliases |
| Anonymous `/ready` (postgres, redis, default-tenant) | EXISTING | `Program.cs:129-134,246-260` — **not wired to Platform UI** |
| `/health` liveness | EXISTING | Always `{"status":"healthy"}` — not a dependency probe |
| Platform production overview / fleet KPIs | MISSING | Nav is Tenants + Support only (`platform-header.tsx:45-52`) |
| Authenticated API/infra health UI | MISSING | No platform health client in `platform-api.ts` |
| Correlated tenant diagnostic timeline | PARTIAL | Snapshot + recent audits + open issues exist; no cross-service timeline |
| Support severity / incident clock | PARTIAL | Status workflow exists; no Severity; no Incident entity |
| Paddle webhook / billing diagnostics UI | PARTIAL | Tenant `BillingStatus` + complimentary UI; ledger `paddle_webhook_events` has no platform API |
| Outbox / failed-job UI | MISSING | `outbox_messages` + processor exist; no platform API |
| Searchable operational + security audits | PARTIAL | `platform_audit_logs` writes; no list/search; no auth/security event table |
| Deploy / version / rollback in Platform UI | MISSING | `GET /api/v1/system/info` is `{Cohestra, v1}`; rollback is SSH runbook only |
| Impersonation, SQL console, secret view, payment mutation, webhook replay | DEFERRED / forbidden | 43.4 non-goals; owner constraints; party lock |
| Epic 19 production UAT | DEFERRED (separate epic) | `epic-19: in-progress`; Production NO-GO until 19.4 |

**Do not reopen:** Epic 11 (done), Epics 26–28 (shipped on main; tracker gap in `sprint-status.yaml`), Story 43.4 / Epic 43 (done, spec frozen), Epic 29 (Paddle adapter done). Justified defects only: missing Epic 28 integration tests; `PlatformOpsController` omitted from policy test list.

---

## 2. Production-support gap analysis (severity-ranked)

KPI quality key: **Actual** = queryable now and shown or showable; **Unavailable** = data exists, no Platform API/UI; **Missing instrumentation** = not recorded; **Stale** = recorded without freshness.

| Rank | Gap | Severity | Classification | Why it pages someone | Source quality |
| ---- | --- | -------- | -------------- | -------------------- | -------------- |
| 1 | Stack health not in Platform Admin | MAJOR | MISSING (UI/API); `/ready` EXISTING anonymous | “Is UAT/prod up?” requires curl/SSH | Actual (3 checks only) |
| 2 | Outbox / failed notifications invisible | MAJOR | MISSING | Checkout-ok / email-missing tickets | Unavailable (`outbox_messages`) |
| 3 | Paddle webhook diagnostics missing | MAJOR | PARTIAL | BillingStatus stuck; ledger is success-only | Unavailable success rows; **Missing instrumentation** for retry/invalid/ignored |
| 4 | No correlated tenant timeline | MAJOR | PARTIAL | Support correlates snapshot + audits + mail + billing by hand | Mixed Actual fragments |
| 5 | No fleet overview with provenance | MAJOR | MISSING | No single pulse of suspended / on-hold / open issues / health | Partial Actual (directory aggregates exist per row) |
| 6 | Audits not searchable platform-wide | MAJOR | PARTIAL | Cannot answer “who archived X last week?” without SQL | Actual table, Unavailable API |
| 7 | No deploy SHA / env in console | MINOR–MAJOR | MISSING | Rollback runbook exists; operators cannot see *what* is running | Missing instrumentation |
| 8 | Support has no severity | MINOR | PARTIAL | Inbox already works; triage is status-only | Actual statuses |
| 9 | Epic 28 test/rate-limit debt | MAJOR (quality) | PARTIAL | Snapshot/recovery untested at HTTP; recovery unthrottled | n/a |
| 10 | Bounded outbox requeue | DEFER until #2 | MISSING | Need proven Failed volume first | n/a |
| 11 | Incident aggregate / PagerDuty clone | DEFER | MISSING | Duplicates support inbox | n/a |
| 12 | Rollback button / job console / impersonation | FORBIDDEN | DEFERRED | Owner + 43.4 + party lock | n/a |
| 13 | Serilog / OpenTelemetry pipeline | DEFER | MISSING | Separate observability epic; not required to read Postgres ledgers | Missing instrumentation |
| 14 | Epic 19 live billing UAT | BLOCKER for **production cutover**, not for this epic | in-progress | `#404` merged; 19.4 not accepted | n/a |

---

## 3. Proposed operator navigation and UX information architecture

**Non-negotiables (43.4 + party):** sparse staff console; `--plat-*` aliases + gold wash; `AdminSkipLink` + one `main` + one `h1`; `aria-current`; ≥44px; no `AdminRouteTransition`; no tenant sidebar/PlanBadge; copy lock “Workspace paused.” / “Billing is on hold.”; `/platform/login` stays apex-only.

### Nav (desktop 1440×900 and mobile 390×844)

| Order | Label | Route | Notes |
| ----- | ----- | ----- | ----- |
| 1 | Overview | `/platform/overview` | Fleet pulse. **Not** the default bookmark for Tenants. |
| 2 | Tenants | `/platform` | **Unchanged home.** Directory + create. Degraded banner if authenticated health ≠ Healthy. |
| 3 | Support | `/platform/support` | Existing inbox + report. Optional severity filter later. |
| 4 | Operations | `/platform/ops` | In-page sections: Health · Billing · Outbox. One nav item, not three. |
| 5 | Audits | `/platform/audits` | Global search. Tenant detail keeps “recent audit”. |
| — | Sign out | existing | |

Deep links (not top nav): `/platform/tenants/[id]` (existing + timeline section); `/platform/support/[id]`; `/platform/ops?section=billing`.

### States (every new view)

`loading` · `empty` · `stale` (freshness) · `degraded` (subset of checks down) · `error` · `unauthorized` (reuse guards) · `success`. No decorative charts. No fake live ticks.

### Motion

Restrained `transition-colors` only; inherit `prefers-reduced-motion`. Do not introduce Cinema or AdminRouteTransition on platform.

---

## 4. Recommended architecture and observability data sources

### Boundaries

- **In:** `src/Api/Controllers/V1/Platform*.cs`, `src/Infrastructure/Platform|Support|…`, `web/app/(platform)`, `web/lib/platform-api.ts`.
- **Out:** tenant Admin UI; Paddle processor billing semantics; `/ready` public contract (keep 3 checks); Epic 19 droplet credentials; Hangfire; second Next app.
- **Authz:** class-level `PlatformAdminOnly` on every new controller. Add `PlatformOpsController` to `TenantAuthControllerPolicyTests`. Tenant JWT 403. Paginate + clamp. `IgnoreTenantFilters` only on platform services, with TenantIsolation tests for `tenantId` path scoping.
- **KPI envelope (required):**

```text
PlatformKpi<T> { value, source, observedAt, freshness: actual | missing_instrumentation | unavailable | stale }
```

### Data sources

| KPI / view | Source | How to read | Freshness rule |
| ---------- | ------ | ----------- | -------------- |
| Postgres / Redis / default-tenant | `HealthCheckService` ready-tagged checks | New `GET /api/v1/platform/ops/health` (auth). Do **not** change anonymous `/ready` JSON | `actual`; include sanitized status + duration; **never** connection strings |
| Outbox pending/processing/failed counts | `outbox_messages` | Group by Status (+ optional MessageType) | `actual` once API exists; `observedAt` = query time |
| Failed outbox list | same | Filter Status=Failed; **omit PayloadJson**; truncate LastError | `actual`; pageSize ≤ 50 |
| Paddle processed events | `paddle_webhook_events` | page + filter eventType, time, tenant if later joined | `actual` for **successes only** |
| Paddle retries/invalid/ignored | **not stored today** | Additive `paddle_webhook_deliveries` (disposition, event id/type, truncated detail, optional tenantId). Do not store raw body | Until shipped: `missing_instrumentation` |
| Paddle config (no secrets) | `PaddleSettings` | `environment`, `isConfigured`, `allowLive`, `apiBase` host only | `actual` |
| Tenant billing state | `tenants.BillingStatus`, plan, complimentary | Existing snapshot/directory | `actual`; display-only |
| Tenant usage meters | `ITenantAccessService.GetUsageAsync` | Existing snapshot | `actual` |
| Support open count / report | `support_issues` | Existing APIs | `actual` |
| Platform audits | `platform_audit_logs` | New paginated search (action, tenant, actor, from/to) | `actual` |
| Security events (failed platform login, webhook sig reject) | logs only today | Optional later table; until then `missing_instrumentation` | |
| App version | missing | Inject `GIT_SHA` / `INFORMATIONAL_VERSION` at deploy (`remote-deploy.sh` already logs SHA) into `GET /api/v1/platform/ops/version` | After: `actual`; now `missing_instrumentation` |
| Hosted job heartbeat (billing jobs, outbox dispatcher, expiration) | missing | Optional last-success timestamp table | `missing_instrumentation` until added |
| Tenant dashboard metrics | tenant-only Redis cache | **Do not** reuse as platform fleet metrics | n/a |

### Explicitly forbidden operations

Webhook replay · marking invoices paid · editing `BillingStatus` by hand · impersonation · raw SQL · shell · revealing `Paddle__*` / JWT / SendGrid keys · unbounded `IgnoreQueryFilters` dumps · returning outbox `PayloadJson`.

### Bounded recovery (phase-gated)

Only after outbox read model is in production use: `POST /api/v1/platform/ops/outbox/{id}/requeue` if Status=Failed; CAS to Pending; keep LastError history in audit; rate-limit per actor; `PlatformAuditAction.OutboxRequeued`. No payload edit. No completed-message replay.

---

## 5. Proposed Epic 44 story breakdown (not created yet)

**Epic name:** Platform Production Operations & Support Center  
**Depends on:** existing PlatformAdmin plane (11, 12.4, 17.3, 26–28, 43.4). **Does not depend on** Epic 19 close. **Must not block or replace** 19.4/19.5.

| Story | Scope | Depends | Authz | Threats | Tests | Rollback |
| ----- | ----- | ------- | ----- | ------- | ----- | -------- |
| **44.0 Hardening** | Policy test includes `PlatformOpsController`; HTTP integration tests for snapshot/search/members/recovery; recovery rate-limit | none | existing | recovery email flood | unit + integration + TenantIsolation 403 | revert tests/middleware only |
| **44.1 Overview** | `/platform/overview` + `GET /api/v1/platform/ops/overview` fleet KPIs (tenant counts by status/billing, open support, health rollup) with provenance | 44.0 | PlatformAdminOnly | enumeration; expensive counts | unit, integration, Playwright 1440/390, a11y | feature-flag or revert route; directory remains home |
| **44.2 Health** | Authenticated health DTO wrapping ready checks + outbox depth KPIs; Operations Health section; directory degraded banner | 44.1 or parallel after 44.0 | PlatformAdminOnly | info leak via health details | unit (sanitize), integration, E2E degraded copy | revert endpoint; `/ready` unchanged |
| **44.3 Outbox observability** | Paginated failed/pending lists, counts by type; no payload | 44.2 | PlatformAdminOnly | PII in LastError; unbounded queries | unit redaction, integration, TenantIsolation on tenantId filter | revert |
| **44.4 Paddle diagnostics** | Browse processed ledger + config flags; additive delivery dispositions **without** changing processor outcomes | 44.2 | PlatformAdminOnly | secret leak; payload leak; accidental replay UI | unit, webhook integration regression, E2E | disposition table additive; processor untouched |
| **44.5 Tenant timeline** | `GET .../tenants/{id}/timeline` merging audits, support status, billing status fields, tenant outbox summaries | 44.3, 44.4 | PlatformAdminOnly | cross-tenant mix; PII | integration two-tenant, Playwright on detail | revert section; snapshot stays |
| **44.6 Audit search** | `/platform/audits` + paginated search/export CSV | 44.0 | PlatformAdminOnly | bulk PII export | integration pagination, E2E, a11y | revert |
| **44.7 Support severity** | Additive `Severity` on `SupportIssue`; filter + display; **no** new Incident entity unless owner rejects this | 44.0 | PlatformAdminOnly + existing tenant submit unchanged default | enum abuse | unit, integration, Playwright inbox | nullable column; UI hides |
| **44.8 Version health** | Authenticated version (SHA, env name, api version); display on Overview/Ops; **read-only** | 44.1 | PlatformAdminOnly | fingerprinting (acceptable for staff) | unit missing-SHA → `missing_instrumentation` | revert; deploy scripts unchanged |
| **44.9 Failed-outbox requeue** | **Go/no-go after 44.3 evidence.** CAS requeue + audit + rate limit | 44.3 | PlatformAdminOnly | double-send mitigated by outbox dedupe keys; still audit | concurrency tests, integration, E2E AlertDialog | disable endpoint |

**Out of epic:** impersonation, SQL, Hangfire UI, rollback execute, Paddle replay, payment mutation, OTel, Epic 19 UAT, flattening `--plat-*`, Cinema.

Each created story (after approval) must still pass `bmad-create-story` → `bmad-dev-story` → build/test → `bmad-code-review` loop → product/UX acceptance → `bmad-testarch-*` as applicable (ATDD for 44.1/44.2, automate, NFR for 44.3/44.4, tenant-isolation trace).

---

## 6. Risks, security boundaries, and measurable acceptance

### Security boundaries

| Control | Rule |
| ------- | ---- |
| Identity | PlatformAdmin ⊥ TenantAdmin; apex `/platform/login` only |
| Authz | `PlatformAdminOnly` claim + no hybrid tokens |
| Tenant isolation | Tenant JWTs 403 on `/api/v1/platform/*`; platform queries with `tenantId` never return another tenant’s rows |
| Data minimization | No secrets, no outbox payloads, truncated errors, Paddle ids only if already implied by ops need (prefer not to show customer id unless timeline requires it) |
| Abuse | Pagination caps; recovery + requeue + search rate limits; CAS on requeue |
| Audit | Mutations (requeue, severity, existing lifecycle) write `PlatformAuditLog`; do not log tokens |
| Billing | Read-only diagnostics; processor and FR-23/Suspend invariants unchanged |
| Deploy | No production credential changes; no merge-to-main of this proposal as “done product” |

### Threat scenarios (story-level, condensed)

1. TenantAdmin calls overview/health/outbox → 403.  
2. PlatformAdmin requests tenant B timeline with tenant A id → empty/404, no mix.  
3. Outbox list JSON must not contain `PayloadJson` or email bodies.  
4. Health details must not include connection strings or Paddle secrets.  
5. UI has no Replay Webhook / Mark Paid / Impersonate.  
6. Concurrent requeue of one Failed row succeeds once.  
7. Unbounded pageSize clamped.

### Measurable acceptance (epic)

- All nine target capabilities classified in §1 are either implemented as scoped in §5 or explicitly DEFERRED in the epic file.  
- Every Overview/Ops KPI shows provenance; a missing SHA renders `missing_instrumentation`, not `v1` pretending to be a build id.  
- `/ready` anonymous contract unchanged (postgres, redis, default-tenant only).  
- Playwright: Overview, Operations, Audits, tenant timeline at 1440×900 and 390×844; skip-link + `aria-current`; no horizontal page overflow; reduced-motion does not trap focus.  
- `dotnet test` unit + integration (fresh `cohestra_test`, `CI=true`) including TenantIsolation on new endpoints.  
- Frontend unit tests for API helpers and provenance rendering.  
- BMAD code-review on **final HEAD** with no unresolved BLOCKER/MAJOR.  
- Product acceptance on data truth (queries match DB), not CI alone.  
- Live UAT / production deploy **not** claimed by this epic; Epic 19 remains the launch gate.  
- No merge/deploy/production credential work without explicit owner authorization.

### Rollback strategy (epic)

Additive routes and tables. Revert the Epic 44 PR(s). Existing `/platform` directory, support inbox, lifecycle, Paddle webhooks, and `/ready` keep working. Disposition/heartbeat tables may remain unused.

---

## Approval ask

Please confirm or amend:

1. Epic 44 numbering and story cut (§5), especially **severity-only vs Incident entity** and **44.9 go/no-go**.  
2. Nav: Overview as extra item vs pulse-strip-only on directory.  
3. Additive webhook **disposition** table (recommended) vs success-ledger-only (will show `missing_instrumentation` for failures).  
4. Authorization to run `bmad-create-epics-and-stories` after this file.

**Stop.** No feature implementation until that approval.
