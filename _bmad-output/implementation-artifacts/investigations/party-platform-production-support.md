# Party: Platform production-support evolution

Date: 2026-10-08  
Mode: session  
Roster: John (PM), Sally (UX), Winston (Architect), Amelia (Dev), Murat (Test Architect)  
Open-cast: Vex (Security), Dana (Pragmatist)  
Memory: installed party memlog (prior Paddle adapter-only lock still in the room)

---

The evidence is on the table: Epic 11 lifecycle, Epic 28 snapshot/support/recovery, 43.4 staff console, `/ready` anonymous, outbox and Paddle ledgers with no Platform API, Epic 19 still Production NO-GO.

📋 **John:** Before anyone draws a nine-item nav, tell me the job. Support gets a ticket: “Core tenant says checkout succeeded, members didn’t get mail, site still Basic.” Today they open Tenants, squint at BillingStatus, maybe the snapshot, then they are in psql. That is the job. Not a Grafana costume.

🎨 **Sally:** And that job still lives in the sparse console. Ink header, gold wash, Tenants and Support. If you demote Tenants off `/platform`, you break 43.4 muscle memory and the E2E that treats directory as home. I will not merge this into tenant AdminSidebar. I will not wrap it in AdminRouteTransition. Overview can exist. It does not get to eat the directory.

🏗️ **Winston:** Agreed on the plane: same Next app, `/api/v1/platform/*`, `PlatformAdminOnly`. No Hangfire, no metrics microservice, no second frontend. Read models over `outbox_messages`, `paddle_webhook_events`, `platform_audit_logs`, plus `HealthCheckService` behind auth. `/ready` stays anonymous and stays three checks — do not silently widen the public probe; add a richer authenticated DTO.

🔒 **Vex:** Stop. `paddle_webhook_events` is an idempotency ledger, not a debug dump. If you expose it, no raw JSON, no secrets, no ApiKey, no WebhookSecret. Outbox `PayloadJson` is PII — confirmation emails, operator addresses — never return it. LastError truncated. Tenant JWT still 403 on every new route. Path `tenantId` must 404/empty for the wrong tenant even though PlatformAdmin sees all. And nobody is replaying webhooks. Unique `event_id` is the only thing between you and double PastDue.

😤 Wait — Dana, not Grumbal, but close:

🚢 **Dana:** Vex is right about replay. Wrong about boiling the ocean. We do not need OpenTelemetry to tell an operator twenty Failed `registration.confirmation` rows exist. Postgres already knows. Ship the read model. Don’t invent Incident as a second case system until Support severity fails in production.

🧪 **Murat:** Quality debt is not optional garnish. Epic 28 never got integration tests. `PlatformOpsController` is missing from the policy test list. First story that touches platform APIs closes that, and every new list is TenantIsolation plus PlatformAdmin-only 403. Playwright at 1440 and 390. No synthetic health in E2E fixtures pretending Redis is down if the test can hit `/ready`.

💻 **Amelia:** File paths, then. Do not reopen `PlatformTenantService` lifecycle. Do not change complimentary. Do not edit Paddle processor semantics. New `IPlatformObservabilityService` or split health/outbox/billing query services. Paginate. Clamp pageSize. Add `ObservedAt` + `Source` + `Freshness` on KPI DTOs so the UI cannot lie. Git SHA from deploy env, not `SystemController`’s `{ Name: Cohestra, ApiVersion: v1 }`.

📋 **John:** Rank it. (1) Health + outbox counts — because “is the box alive / is mail stuck” pages people. (2) Paddle ledger by tenant and event type — the checkout ticket. (3) Tenant timeline correlating audit + support + billing status + that tenant’s outbox. (4) Overview KPIs with provenance, not spark-lines. (5) Audit search. (6) Version readout. (7) Severity on support. Recovery last, and only Failed-outbox requeue after (1) proves the queue is real.

🎨 **Sally:** Nav, then. Keep `/platform` as Tenants. Add **Overview** `/platform/overview` first in the bar. Add **Operations** `/platform/ops` with in-page sections: Health, Billing, Outbox — not three top-level links. Add **Audits** `/platform/audits`. Support stays. Aria-current rules like 43.4. Directory gets a **degraded banner** when authenticated health is not Healthy — actual data, dismissible, not a chart. Loading, empty, stale, degraded, error, unauthorized, success on every new surface. Restrained `transition-colors` only; `prefers-reduced-motion` inherited. 44px targets.

🏗️ **Winston:** Webhook diagnostics will lie if you only read `paddle_webhook_events`. Processor inserts **after** success. Retryable failures never land. That is Missing instrumentation, not Stale. Additive disposition log is allowed. Changing handler outcomes is not. Complimentary still skips FR-23. Suspend still does not mean unpaid.

🔒 **Vex:** Disposition log: event id, type, disposition, truncated detail, resolved tenant id, timestamp. No payload. Rate-limit recovery and even expensive searches. Concurrent requeue: compare status Failed, CAS to Pending. Audit `OutboxRequeued`. If you add job replay of Paddle, I will fail the review on purpose.

🧪 **Murat:** Acceptance is not CI green. Epic 19 live UAT is a different gate. Don’t let anyone mark production-support “ready” because unit tests passed on a fresh `cohestra_test`.

🚢 **Dana:** Defer: impersonation, SQL console, Hangfire dashboard, rollback button, Serilog, Incident aggregate, deploy-from-the-UI. File them as out of scope so the next agent does not “helpfully” add them.

🎨 **Sally:** Identity copy stays: “Workspace paused.” vs “Billing is on hold.” Operations pages display BillingStatus. They do not offer “mark paid”.

📋 **John:** Epic 44, additive, after Admin says go. `bmad-create-epics-and-stories` not tonight. Stop.

---

## Party lock (do not soften)

- Same Platform Admin plane; `/platform/login` apex; no second frontend; no tenant-admin merge.
- `/platform` remains tenant directory home.
- New nav: Overview, Tenants, Support, Operations, Audits.
- KPIs carry provenance. No synthetic live metrics.
- No webhook replay, impersonation, SQL, secrets, payment mutation, arbitrary job replay.
- Failed-outbox requeue only after read model, with CAS + audit + rate limit.
- Epic 19 UAT remains a separate production gate.
- Epic 11 / 28 / 29 / 43.4 not reopened except justified defects (policy-test omission + Epic 28 integration tests are justified hardening).
