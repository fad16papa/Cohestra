# Proposal: Platform Production Operations & Support Center

**Status:** Owner-approved with refinements 2026-10-08 — planning complete; no implementation  
**HEAD audited:** `main` `69814fc3` (reconciled with PR #411; `origin/main` has no additional commits)  
**Canonical epic:** `_bmad-output/planning-artifacts/epics-platform-production-support.md`  
**Skills:** `bmad-investigate` · `bmad-party-mode` · `bmad-create-epics-and-stories` · `bmad-architecture` · `bmad-ux` · `bmad-testarch-test-design`

Do not run `bmad-create-story` / `bmad-dev-story` until the owner authorizes implementation.

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

### Bounded recovery (not in Epic 44)

Failed-outbox requeue is **not authorized**. Recorded as a conditional future decision after Story 44.4 is accepted. No requeue route in this epic.

---

## 5. Epic 44 story breakdown (canonical)

Canonical source: `_bmad-output/planning-artifacts/epics-platform-production-support.md`.

**Epic name:** Platform Production Operations & Support Center  
**Depends on:** existing PlatformAdmin plane (11, 12.4, 17.3, 26–28, 43.4). **Does not depend on** Epic 19 close. **Must not block or replace** 19.4/19.5.

| Story | Scope | Depends |
| ----- | ----- | ------- |
| **44.1** Platform ops HTTP gates, policy coverage, recovery rate limits | first story; no 44.0 | none |
| **44.2** Production overview `/platform/overview` | provenance KPIs; directory stays `/platform` | 44.1 |
| **44.3** Authenticated health + Operations shell + directory banner | `/ready` unchanged | 44.2 |
| **44.4** Outbox observability read-only | no payload; no requeue | 44.3 |
| **44.5** Additive Paddle disposition + billing diagnostics | processor unchanged | 44.3 |
| **44.6** Tenant diagnostic timeline | | 44.4, 44.5 |
| **44.7** Searchable audits | | 44.1 |
| **44.8** Support severity | no Incident entity | 44.1 |
| **44.9** Version health read-only | | 44.2, 44.3 |

**Out of epic:** outbox requeue, impersonation, SQL, Hangfire UI, rollback execute, Paddle replay, payment mutation, OTel, Epic 19 UAT, flattening `--plat-*`, Cinema.

Implementation (when owner authorizes) still follows `bmad-create-story` → `bmad-dev-story` → build/test → `bmad-code-review` loop → product/UX acceptance.

---

## 6. Risks, security boundaries, and measurable acceptance

### Security boundaries

| Control | Rule |
| ------- | ---- |
| Identity | PlatformAdmin ⊥ TenantAdmin; apex `/platform/login` only |
| Authz | `PlatformAdminOnly` claim + no hybrid tokens |
| Tenant isolation | Tenant JWTs 403 on `/api/v1/platform/*`; platform queries with `tenantId` never return another tenant’s rows |
| Data minimization | No secrets, no outbox payloads, truncated errors, Paddle ids only if already implied by ops need (prefer not to show customer id unless timeline requires it) |
| Abuse | Pagination caps; recovery rate limits; search/export caps |
| Audit | Mutations (severity, existing lifecycle/recovery) write `PlatformAuditLog`; do not log tokens |
| Billing | Read-only diagnostics; processor and FR-23/Suspend invariants unchanged |
| Deploy | No production credential changes; no merge-to-main of this proposal as “done product” |

### Threat scenarios (story-level, condensed)

1. TenantAdmin calls overview/health/outbox → 403.  
2. PlatformAdmin requests tenant B timeline with tenant A id → empty/404, no mix.  
3. Outbox list JSON must not contain `PayloadJson` or email bodies.  
4. Health details must not include connection strings or Paddle secrets.  
5. UI has no Replay Webhook / Mark Paid / Impersonate / Requeue.  
6. Unbounded pageSize clamped.  
7. `/ready` check set unchanged.

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

## Approval (recorded)

Owner approved 2026-10-08 with refinements: Overview at `/platform/overview`; `/platform` stays directory; Operations and Audits separate nav; severity without Incident; additive disposition logging; requeue not authorized; Epic 19 independent.

Remaining owner decisions are listed in the canonical epic file.

**Stop.** No `bmad-dev-story`, feature code, merge, or production changes from this planning pass.
