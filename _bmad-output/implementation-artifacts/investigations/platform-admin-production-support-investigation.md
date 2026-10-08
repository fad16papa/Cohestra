# Investigation: Platform Admin production-support evolution

## Hand-off Brief

1. **What happened.** Admin asked to evolve the existing Platform Admin into a Production Operations & Support Center. Source on `main` `69814fc3` already ships tenant lifecycle (Epic 11), ops console + support inbox (Epics 26–28), and 43.4 staff-console UX — not a greenfield admin.
2. **Where the case stands.** Current-state audit is **Concluded** at High confidence. Nine target capabilities classified EXISTING / PARTIAL / MISSING / DEFERRED with file evidence. No implementation started.
3. **What's needed next.** Owner approval of `_bmad-output/planning-artifacts/proposal-platform-production-support.md`. Then `bmad-create-epics-and-stories` for proposed Epic 44. Do not reopen Epics 11, 28, 29, or Story 43.4 without a justified defect.

## Case Info

| Field            | Value                                                                      |
| ---------------- | -------------------------------------------------------------------------- |
| Ticket           | N/A (owner request: Platform Admin Production Support Evolution)           |
| Date opened      | 2026-10-08                                                                 |
| Status           | Concluded                                                                  |
| System           | Cohestra `main` HEAD `69814fc3`; .NET 9 API + Next.js 16 web               |
| Evidence sources | Source, tests, `_bmad-output` stories/specs/reviews, `docs/deploy/*`, git  |

## Problem Statement

User hypothesis: Platform Admin must become a secure, scalable Production Operations & Support Center covering overview KPIs, infra health, tenant diagnostic timelines, support/incidents, Paddle diagnostics, outbox/failed jobs, searchable audits, deploy/version health, and bounded recovery.

Treat as an **area-exploration** case (no production incident). The hypothesis that these capabilities are largely missing is **partially contradicted**: tenant ops, support inbox, snapshots, and limited recovery already exist. Infra/billing/outbox/deploy observability in the Platform UI is Missing or Partial.

## Evidence Inventory

| Source | Status | Notes |
| ------ | ------ | ----- |
| Platform API controllers | Available | `src/Api/Controllers/V1/Platform*.cs` (5 controllers) |
| Platform web routes | Available | `web/app/(platform)/**`, `web/app/platform/login` |
| Authz / isolation | Available | `PlatformAdminOnly`, JWT `platform_admin`, TenantIsolation tests |
| Epic 11 / 28 / 43.4 artifacts | Available | Stories, specs, reviews, E2E; Epic 28 missing from `sprint-status.yaml` |
| Health / outbox / logging | Available | `/ready`, `OutboxProcessor`, default ILogger; no Serilog/OTel |
| Paddle / Epic 19 / 29 | Available | Ledger + processor on main `#404`; Epic 19 still in-progress / Production NO-GO |
| Accessibility / motion | Available | 43.4 source tests + Playwright 1440×900 / 390×844 |
| Live production logs | Missing | No droplet log dump in this investigation |
| Live UAT product acceptance | Missing | 19.4 sandbox UAT not accepted |

## Investigation Backlog

| # | Path to Explore | Priority | Status | Notes |
| - | --------------- | -------- | ------ | ----- |
| 1 | Platform controllers + services + entities | High | Done | Subagent + parent verify |
| 2 | Platform frontend IA, tokens, a11y | High | Done | |
| 3 | Health, outbox, Paddle, deploy docs | High | Done | `#404` is merged; contradict earlier “unmerged” note |
| 4 | Epic 11 / 28 / 43.4 / 19 freeze rules | High | Done | |
| 5 | Party-mode product/UX/arch/security | High | Done | `_bmad-output/implementation-artifacts/investigations/party-platform-production-support.md` |
| 6 | Live droplet metrics / 19.4 UAT | Medium | Blocked | Requires owner SSH + Paddle dashboard; out of this case |

## Timeline of Events

| Time | Event | Source | Confidence |
| ---- | ----- | ------ | ---------- |
| 2026-07-29 | Epic 11 done (lifecycle, directory, `/ready`, complimentary) | `sprint-status.yaml:196-202` | Confirmed |
| 2026-08-19 | Epic 28 Platform Ops Console code review complete on main | `code-review-epic-28-platform-ops-2026-08-19.md` | Confirmed |
| 2026-08-21 | Epic 25 retro: Epics 26–28 already merged | `epic-25-retro-2026-08-21.md:114-116` | Confirmed |
| 2026-10-08 | Story 43.4 + Epic 43 closed | `epic-43-close-2026-10-08.md`, `sprint-status.yaml:434-440` | Confirmed |
| 2026-10-08 | Paddle webhook retries, refund ingest, credential isolation merged `#404` | `git log` `69814fc3` | Confirmed |
| 2026-10-08 | Epic 19 still in-progress; Production NO-GO pending 19.4 | `sprint-status.yaml:261-278`, `docs/deploy/paddle-production-cutover.md:3-17` | Confirmed |

## Confirmed Findings

### Finding 1: Platform Admin identity boundary is already separate

**Evidence:** `README.md:64-76`; `src/Infrastructure/Auth/TenantAuthorizationExtensions.cs:32-61`; `web/app/platform/login/page.tsx`; `web/lib/auth-api.ts:194-205`

**Detail:** `/platform/login` on marketing apex; JWT claim `platform_admin=true`; policy rejects any `tenant_id` or membership `role`. Tenant Admin and Platform Admin are mutually exclusive. Do not merge into tenant Admin chrome (43.4 non-goal).

### Finding 2: Tenant lifecycle, directory, snapshot, support inbox, and bounded recovery exist

**Evidence:**
- Lifecycle: `src/Api/Controllers/V1/PlatformTenantsController.cs:65-152`
- Directory + omni-search: `PlatformTenantsController.cs:19-40`, `PlatformOpsController.cs:17-24`
- Snapshot: `src/Contracts/Platform/PlatformOpsContracts.cs:15-30`, `PlatformTenantOpsService.cs:26-69`
- Support: `PlatformSupportIssuesController.cs`, `web/app/(platform)/platform/support/`
- Recovery: password-reset + resend-verify `PlatformOpsController.cs:60-102`
- Nav: Tenants + Support only `web/components/platform/platform-header.tsx:45-52`

### Finding 3: `/ready` is anonymous infra health, not a Platform Admin surface

**Evidence:** `src/Api/Program.cs:129-134,244-260`

**Detail:** Checks postgres, redis, default-tenant. `/health` is liveness-only (`{"status":"healthy"}`). No outbox, Paddle, SendGrid, or hosted-job checks. Platform UI does not consume `/ready`.

### Finding 4: Outbox and Paddle ledgers exist as data, not as Platform APIs

**Evidence:** `src/Domain/Outbox/OutboxMessage.cs`; `src/Infrastructure/Outbox/OutboxProcessor.cs`; `src/Domain/Billing/PaddleWebhookEvent.cs`; `src/Infrastructure/Billing/PaddleWebhookProcessor.cs:24-99`

**Detail:** Failed outbox rows and successfully processed webhook events are queryable in PostgreSQL. No `/api/v1/platform/*` read models. Webhook table stores only processed tracked events — retries/invalid/ignored are not persisted.

### Finding 5: Platform audits are write-heavy and per-tenant, not searchable

**Evidence:** `src/Domain/Tenants/PlatformAuditLog.cs`; `PlatformAuditAction.cs`; `PlatformAuditLogConfiguration.cs:35-36`; tenant detail `recentAudits` only (`PlatformTenantContracts.cs:64-66`)

**Detail:** Actions cover lifecycle, complimentary, support reply, recovery. Indexes on `TenantId` and `CreatedAt`. No list/search/export endpoint. No security-event stream (failed logins, webhook signature rejects).

### Finding 6: Frozen / closed work must not be reopened as this epic

**Evidence:** Epic 11 done; Epic 28 shipped on main (tracker gap); spec 43.4 frozen; Epic 29 done; Epic 19 in-progress not frozen.

**Detail:** Duplicate risk is rebuilding lifecycle, snapshot, support inbox, or flattening `--plat-*` tokens. New work must be additive production-support surfaces.

### Finding 7: HEAD already includes Paddle remediation `#404`

**Evidence:** `git log -1` `69814fc3 fix(billing): Paddle webhook retries, refund ingest, credential isolation (#404)`

**Detail:** Adjustment cursors + retry HTTP 503 + credential isolation are on main. Remaining Epic 19 gap is **UAT/acceptance**, not missing webhook processor code.

### Finding 8: Platform metrics currently shown are API-backed, not synthetic

**Evidence:** `web/lib/platform-api.ts`; directory counts; snapshot meters; support open-count; support report KPIs. No client mock generators.

### Finding 9: Quality debt on Epic 28 is real but not a freeze-break

**Evidence:** `code-review-epic-28-platform-ops-2026-08-19.md:19-25`; `TenantAuthControllerPolicyTests.cs:66-74` omits `PlatformOpsController`

**Detail:** Missing integration tests for snapshot/search/recovery; missing platform rate limits on recovery; policy-test omission. Justified hardening inside a new epic, not a reopen of Epic 28.

## Deduced Conclusions

### Deduction 1: The product gap is observability and correlation, not a second admin app

**Based on:** Findings 1, 2, 3, 4, 8

**Reasoning:** Staff already provision, suspend, triage support, and reset member passwords in the existing console. They cannot see stack health, stuck mail, webhook failures, or a correlated tenant timeline without SQL/SSH.

**Conclusion:** Extend `web/app/(platform)` + `/api/v1/platform/*` + `PlatformAdminOnly`. Do not add a frontend or merge into tenant Admin.

### Deduction 2: Several “recovery” ideas are unsafe because billing and outbox already have idempotent processors

**Based on:** Findings 4, 7; `PaddleWebhookProcessor` unique `event_id`; outbox max 5 attempts then Failed

**Reasoning:** Arbitrary webhook replay can double-apply subscription state. Raw SQL / impersonation / secret display violate 43.4 non-goals and owner constraints.

**Conclusion:** Only propose recovery with a verified need: bounded Failed-outbox requeue (idempotent, audited, rate-limited). Defer webhook replay, payment-state edits, impersonation, command consoles.

### Deduction 3: KPI provenance must be first-class because sources are mixed

**Based on:** Findings 3, 4, 8; `/api/v1/system/info` has no git SHA (`SystemController.cs:10-15`)

**Reasoning:** Tenant/support numbers are Actual. Outbox/webhook numbers exist in DB but are Unavailable in UI. Deploy SHA is Missing instrumentation. `/ready` is Actual for three checks only.

**Conclusion:** Every Platform KPI DTO needs `source`, `observedAt`, and `freshness` (`actual` \| `missing_instrumentation` \| `unavailable` \| `stale`). Never fabricate live charts.

## Hypothesized Paths

### Hypothesis 1: Operators currently debug production via SSH/SQL because Platform UI cannot answer those questions

**Status:** Open (plausible; no live ops interview in this case)

**Theory:** Droplet `docker logs` + `psql` on `outbox_messages` / `paddle_webhook_events` is the current support path.

**Would confirm:** Owner confirmation or runbook screenshots.

**Would refute:** Existing private dashboards outside this repo.

**Resolution:** Treat as planning assumption; Phase 1 stories remain valuable even if a sidecar exists, because in-app PlatformAdminOnly is the intended staff plane.

### Hypothesis 2: Support “incident management” can be a severity field rather than a new Incident aggregate

**Status:** Open (product call)

**Theory:** `SupportIssue` already has Open/InProgress/WaitingOnOperator/Resolved/Closed (`SupportIssueStatus.cs`). No Severity. A PagerDuty-style Incident entity would duplicate the inbox.

**Would confirm:** Owner agrees severity + optional incident flag is enough.

**Would refute:** Regulatory/on-call requirement for a separate incident clock/postmortem object.

**Resolution:** Propose additive severity in Epic 44; defer a second case system.

## Missing Evidence

| Gap | Impact | How to Obtain |
| --- | ------ | ------------- |
| Live UAT/production log volume | Cannot size outbox/webhook query SLAs from real rates | Owner droplet access (not this run) |
| 19.4 sandbox UAT result | Production cutover remains NO-GO independent of Epic 44 | Story 19.4 execution |
| Operator JTBD interview | Ranking of Overview vs Ops strip | Approval discussion on this proposal |
| Serilog/OTel roadmap | Whether platform audit search should wait on a log pipeline | Explicit observability epic later |

## Source Code Trace

| Element | Detail |
| ------- | ------ |
| Error origin | N/A (exploration; no defect incident) |
| Trigger | Owner request to expand Platform Admin |
| Condition | Existing PlatformAdminOnly console on apex |
| Related files | Platform* controllers/services, `(platform)` app, `/ready`, outbox, Paddle webhook, 43.4 tests |

**I/O map (exploration):**

- **Triggers:** PlatformAdmin JWT on `/platform/*` and `/api/v1/platform/*`; anonymous `/ready` `/health`; anonymous Paddle webhook POST.
- **Outputs:** Tenant list/detail, snapshot, support inbox/report, recovery emails via `IAuthService`, `PlatformAuditLog` writes, outbox email messages.
- **Dependencies:** PostgreSQL (source of truth), Redis (rate limit/cache/OTP — not platform metrics today), SendGrid (outbox handlers), Paddle (webhooks).

## Conclusion

**Confidence:** **High** for current-state inventory and freeze rules. **Medium** for story sequencing pending owner approval.

Platform Admin on `main` is already a sparse staff console: identity-isolated, lifecycle-capable, support-capable, with per-tenant snapshots and two recovery emails. It is **not** a production operations center. The honest gaps are health/outbox/billing observability, correlated tenant timelines, searchable audits, deploy/version readout, and (optionally) support severity. Recovery beyond existing password-reset/resend-verify is **not** justified except a tightly bounded failed-outbox requeue after the read model exists.

Do not duplicate Epics 11/26–28/29/43.4. Do not treat Epic 44 as a substitute for Epic 19 live UAT.

## Recommended Next Steps

### Fix direction

Categorize by mechanism:

1. **Read models over existing tables** (outbox, webhook ledger, audits, health checks) behind `PlatformAdminOnly`.
2. **Additive instrumentation** (git SHA env, hosted-job heartbeat, webhook delivery dispositions) where data is missing.
3. **UX expansion** of the existing platform shell (nav + states), inheriting 43.4 tokens/a11y/motion rules.
4. **Hardening** Epic 28 test/policy gaps inside the first implementation story.
5. **Defer** impersonation, SQL consoles, webhook replay, payment mutation, Hangfire, Serilog/OTel, rollback buttons.

### Diagnostic

None required to start planning. Live volume sampling is optional before query limits.

## Reproduction Plan

Verification plan for the exploration (no defect repro):

1. Log in as PlatformAdmin at `/platform/login` → `/platform` tenant directory + Support nav.
2. Confirm no Overview / Health / Outbox / Audits routes (`web/app/(platform)/platform/` file set).
3. `GET /ready` anonymous → postgres/redis/default-tenant only.
4. `GET /api/v1/system/info` → `{ Name, ApiVersion: v1 }` without SHA.
5. Confirm `paddle_webhook_events` and `outbox_messages` exist with no platform controllers referencing them.

## Side Findings

- `PlatformOpsController` is `PlatformAdminOnly` at class level but omitted from `Platform_controllers_use_PlatformAdminOnly_policy` (`TenantAuthControllerPolicyTests.cs:66-74`). Justified test fix; not a missing policy.
- Platform controllers have no `EnableRateLimiting`; Epic 28 deferred recovery rate limits.
- `--plat-header-muted` remains hardcoded `#8B939C` (`web/app/(platform)/layout.tsx:15`) per 43.4 lock — do not “fix” as part of ops work.
- Epics 26–28 shipped but are absent from `sprint-status.yaml` (tracker gap). Docs-only sync recommended; not a product reopen.
- TenantIsolation CI gate exists for tenant-scoped APIs; new platform list endpoints still need **tenant JWT 403** + **tenantId path isolation** tests.

## Follow-up: 2026-10-08

### New Evidence

Party-mode (John, Sally, Winston, Amelia, Murat, Vex, Dana) recorded in `party-platform-production-support.md`.

### Additional Findings

Party lock: keep `/platform` as tenant directory; add Overview and Operations without merging into tenant Admin; webhook replay forbidden; failed-outbox requeue only after read model proves the need.

### Updated Hypotheses

Hypothesis 2 left Open for owner: severity field vs Incident aggregate — party majority prefers severity-only.

### Backlog Changes

Implementation blocked on owner approval (by design).

### Updated Conclusion

Proposal packaged. Stop. No feature implementation on this HEAD.

## Follow-up: 2026-10-08 #2

### New Evidence

Owner approved planning with refinements (this conversation). `origin/main` still `69814fc3`. Canonical epic created.

### Additional Findings

Hypothesis 2 Confirmed: severity only; Incident deferred. Requeue is not a 44.x story. Story numbering starts at 44.1 (hardening), not 44.0.

### Updated Hypotheses

Hypothesis 2: **Confirmed** (owner).

### Backlog Changes

Planning complete. Implementation still unauthorized.

### Updated Conclusion

Epic 44 planning artifacts validated. Stop.
