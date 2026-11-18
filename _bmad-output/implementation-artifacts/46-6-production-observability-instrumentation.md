---
id: 46.6
key: 46-6-production-observability-instrumentation
title: Production observability instrumentation
status: review
epic: 46
created: 2026-10-24
baseline_commit: e962c8c3eead953a1f56f2b397b3e9d4fc669041
owner_gate: none for OSS OTel; paid vendor is a later 46.7 gate
production: NO-GO
track: C
depends_on:
  - 46.1
parallel_avoid:
  - 46.4
  - 46.9
does_not_implement:
  - 46.7
---

# Story 46.6: Production observability instrumentation

Status: review

## Story

As a **platform operator**,
I want **OpenTelemetry logs, metrics, and traces from API requests, outbox, Paddle webhooks, and jobs**,
so that **we are not blind the first time Production breaks**.

## Acceptance Criteria

1. **Given** the API
   **When** OpenTelemetry is enabled
   **Then** packages export OTLP (Hosting 1.20.x line)
   **And** HTTP, EF (no parameter values), Redis (no token payloads), outbox, Paddle webhook, and hosted jobs are instrumented
   **And** `/ready` is unchanged (still three checks: `postgres`, `redis`, `default-tenant`)

2. **Given** a log/trace containing a forbidden field
   **When** redaction tests run
   **Then** passwords, JWTs, refresh tokens, API keys, Paddle/SendGrid/reCAPTCHA secrets, DB credentials, SSH material, and default PII (emails, phones, form answers) are absent
   **And** `SendGridEmailSender` does not log recipient email or raw provider body in Production

3. **Given** the collector is down
   **When** a request is served
   **Then** the API does not crash

4. **Given** OTLP export configuration
   **When** `OpenTelemetry:Enabled=false` or `OTEL_SDK_DISABLED=true` or the endpoint is empty
   **Then** export is safely disabled and the API still serves

5. **Given** this story
   **When** implementation is reviewed
   **Then** hosted jobs remain inside the API process (AD-4)
   **And** no Grafana/Prometheus/Loki/Tempo dashboards or alert rules are added (46.7)
   **And** Production compose/secrets topology is not rewritten (46.4)
   **And** no broad security-audit rewrite is performed (46.9)
   **And** no unbounded high-cardinality metric labels are introduced
   **And** PRODUCTION=NO-GO

## Tasks / Subtasks

- [x] Task 1: Story context + sprint status + branch from `e962c8c3` (AC 5)
  - [x] Subtask 1.1: Create this story file and mark 46.6 in-progress
  - [x] Subtask 1.2: Record 46.4 / 46.9 / 46.7 non-overlap
- [x] Task 2: OpenTelemetry 1.20.x hosting + OTLP export, safely disableable (AC 1, 4)
  - [x] Subtask 2.1: Add compatible 1.20.x packages
  - [x] Subtask 2.2: Honor `OpenTelemetry:*`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SDK_DISABLED`
  - [x] Subtask 2.3: Collector outage / bad endpoint cannot crash API or `/ready`
- [x] Task 3: Instrument HTTP, EF (no params), Redis (no token payloads), outbox, Paddle, hosted jobs (AC 1)
  - [x] Subtask 3.1: ASP.NET Core + HttpClient (route templates, not raw PII URLs)
  - [x] Subtask 3.2: EF Core without parameter values
  - [x] Subtask 3.3: Redis without token payloads
  - [x] Subtask 3.4: Custom spans/metrics for outbox, Paddle dispositions, hosted jobs
  - [x] Subtask 3.5: Preserve `/ready` exactly three existing checks
- [x] Task 4: Centralized telemetry redaction + SendGrid Production leak fix (AC 2)
  - [x] Subtask 4.1: Deny-list redactor extending `PlatformHealthDescriptionSanitizer` patterns
  - [x] Subtask 4.2: Activity + log processors; drop high-cardinality labels
  - [x] Subtask 4.3: `SendGridEmailSender` never logs recipient email or raw body in Production
- [x] Task 5: Tests — synthetic OTLP, coverage, redaction, collector outage, `/ready`, TenantIsolation, API integration, UAT regression (AC 1–4)
- [x] Task 6: BMAD evidence + redaction coverage matrix (AC 2, 5)
- [x] Task 7: Exact-HEAD BMAD code review loop (no unresolved BLOCKER/MAJOR)
- [ ] Task 8: Product acceptance on the same HEAD; draft PR; no merge; Production NO-GO
  - [x] Product acceptance written for HEAD `d6596101`
  - [x] Draft PR #503
  - [ ] CI success on the same HEAD
  - [x] No merge / Production NO-GO

### Review Findings

Reviewed HEAD `d65961010a7cb56901960955dc2ddb5ac999f8f2` twice with Grok 4.6 Blind Hunter, Edge Case Hunter, and Acceptance Auditor.

Zero unresolved BLOCKER / MAJOR after the review-loop patches.

- [x] [Review][Defer] ASP.NET `http.route` is usually absent at sample time, so the extra paddle HTTP always-on branch is ineffective — deferred, custom `paddle.webhook` span is always-on
- [x] [Review][Defer] Console/file `ILogger` sinks are not passed through `TelemetryRedactingLogProcessor` — deferred, SendGrid/NullEmail source-fixed; remaining log sites are 46.9
- [x] [Review][Defer] `AddRedisInstrumentation` resolves `IConnectionMultiplexer` at TracerProvider build (eager Connect) — deferred, pre-existing Redis singleton; 46.4 owns runtime
- [x] [Review][Defer] Nested `answers` JSON regex is first-`}` best-effort — deferred, `answers` / `form_answer` keys are fully redacted
- [x] [Review][Defer] Empty outbox polls still emit always-on `job.run` — deferred, volume not cardinality; 46.7 dashboards
- [x] [Review][Defer] Collector-outage integration host uses the simple export processor — deferred, production default is batch; ForceFlush outage unit test covers exporter errors

## Dev Notes

### Architecture (must follow)

- AD-4: Jobs stay in the API process. Do not add Hangfire or a worker.
- AD-8: OTel + OTLP is the telemetry contract. No vendor SDK lock-in. Do not widen `/ready`.
- AD-9: Telemetry deny-list is hard. Prefer IDs. Reuse/extend `PlatformHealthDescriptionSanitizer`.
- AD-10 / 46.8: Platform Admin consumes later; this story does not add Platform Admin collection.
- AD-13: Production remains NO-GO. No cutover, no Production SSH, no live providers.
- AD-14 `/ready` frozen: postgres + redis + default-tenant only.

### Parallel coordination (do not overlap)

| Story | Owns | 46.6 must not |
| --- | --- | --- |
| 46.4 | Runtime, secrets, Production Compose | Rewrite `docker-compose.production.yml`, `.env.production.example`, Redis password/host secrets |
| 46.9 | Broad Production security audit | Re-open tenant isolation, CSP, CORS, JWT rotation, recaptcha Production audit |
| 46.7 | Dashboards, alert matrix, Grafana OSS | Add Grafana/Prometheus/Loki/Tempo, alert rules, paid vendor |

46.6 **consumes** the existing 46.1 collector contract and the already-injected `OTEL_EXPORTER_OTLP_ENDPOINT` (`http://otelcol:4318` default). Do not provision a paid vendor.

### Target pipeline (this story stops at the SDK)

```
api+jobs → OTLP → existing cohestra-prod-otelcol (debug exporter)
```

Dashboards and alert routing are 46.7.

### Instrumentation targets

| Surface | How | Forbidden |
| --- | --- | --- |
| HTTP | `AddAspNetCoreInstrumentation` + `AddHttpClientInstrumentation` | Raw URLs with PII, request bodies, `Authorization` |
| EF Core | `AddEntityFrameworkCoreInstrumentation`; `EnableSensitiveDataLogging` stays off | Parameter values |
| Redis | `AddRedisInstrumentation` + strip statement/keys that look like tokens | Refresh tokens, OTP, session payloads |
| Outbox | Custom `outbox.dispatch` span + counter (`message_type`, `status`) | `PayloadJson` |
| Paddle webhook | Custom `paddle.webhook` span + counter (`event_type`, `disposition`) | Raw body, signature, secrets |
| Hosted jobs | Custom `job.run` span + duration histogram | Tenant emails, digest bodies |

Hosted jobs to wrap (already registered in `DependencyInjection.cs`):

- `OutboxDispatcherHostedService`
- `BillingJobsHostedService`
- `ActivityExpirationHostedService`
- `FollowUpDigestHostedService`

### Sampling

- 10% baseline (`TraceIdRatioBased`)
- Always-on for `paddle.webhook`, `outbox.dispatch`, `job.run`, `http.unhandled_exception`
- Metrics are not sampled

### Packages (1.20.x line)

- `OpenTelemetry.Extensions.Hosting` 1.20.1
- `OpenTelemetry.Exporter.OpenTelemetryProtocol` 1.20.1
- `OpenTelemetry.Instrumentation.AspNetCore` 1.20.1
- `OpenTelemetry.Instrumentation.Http` 1.20.1
- `OpenTelemetry.Instrumentation.Runtime` 1.20.1
- `OpenTelemetry.Instrumentation.EntityFrameworkCore` 1.20.1-beta.1 (contrib line)
- `OpenTelemetry.Instrumentation.StackExchangeRedis` 1.20.1-beta.1 (contrib line)

### Config

```
OpenTelemetry:Enabled
OpenTelemetry:ServiceName=cohestra-api
OpenTelemetry:OtlpEndpoint   (fallback: OTEL_EXPORTER_OTLP_ENDPOINT)
OpenTelemetry:Protocol=http/protobuf
OpenTelemetry:TracesSamplerRatio=0.1
OTEL_SDK_DISABLED=true       → SDK off
```

Empty endpoint = instrumentation may run in-process, no OTLP exporter.

### Known leak

`SendGridEmailSender` currently logs `{ToEmail}` and raw `{Body}`. Production must not. Prefer never logging either, in any environment.

`NullEmailSender` also logs `{ToEmail}` — remove so console/filelog cannot leak.

### `/ready` contract (do not change)

Anonymous GET `/ready` returns `{ status, checks: { postgres, redis, default-tenant } }` with only `status` per check. Do not add OTel as a health check.

### Testing

- Unit: redactor matrix, processors, sampler, options, SendGrid/NullEmail logging, synthetic OTLP (in-memory + HTTP collector), collector-down ForceFlush does not throw, no extra health checks
- Integration: collector outage host still serves `/health` and `/ready`; `/ready` still exactly three checks
- Regression: existing TenantIsolation + API integration + unit suite on the same HEAD
- Do not SSH, do not dispatch Production deploy, do not run Production compose

### Project Structure Notes

- New types: `src/Infrastructure/Observability/` (redactor, ActivitySource, processors, options)
- Host registration: `src/Api/Observability/` + `Program.cs`
- Tests: `src/Infrastructure.Tests/Observability/`, `src/Api.IntegrationTests/`
- Do not add a new worker project

### References

- `_bmad-output/planning-artifacts/epics-production-launch-readiness.md` Story 46.6
- `_bmad-output/planning-artifacts/prds/prd-cohestra-production-launch-2026-10-19/prd.md` FR-13–17, FR-35, NFR-7
- `_bmad-output/planning-artifacts/architecture/architecture-cohestra-epic-46-2026-10-19/ARCHITECTURE-SPINE.md` AD-4, AD-8, AD-9, AD-13
- `_bmad-output/planning-artifacts/epic-46/observability-architecture.md`
- `_bmad-output/planning-artifacts/epic-46/production-security-model.md`
- `_bmad-output/planning-artifacts/epic-46/nfr-test-strategy.md`
- `_bmad-output/planning-artifacts/epic-46/parallel-execution-plan.md`
- `_bmad/custom/mandatory-code-review-loop.md`

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.6

### Debug Log References

- `dotnet build Cohestra.sln` — succeeded
- `dotnet test Cohestra.sln --filter Category!=Integration` — **1321 passed** on `d6596101`
- `dotnet test Infrastructure.Tests --filter Category=TenantIsolation` — 9 passed
- `dotnet test Api.IntegrationTests --filter Category=TenantIsolation` — 39 passed (included in the 217 Integration category run)
- `dotnet test Api.IntegrationTests --filter Category=Integration` — **217 passed / 0 skipped** (fresh `cohestra_test` + Redis FLUSHALL)
- Collector-down host: `ObservabilityCollectorOutageIntegrationTests` passed after moving Redis instrumentation into `WithTracing` (DI-time, not post-`ServiceProvider`)
- UAT compose/workflow untouched. Production compose/secrets untouched.

### Completion Notes List

- API SDK exports OTLP on OpenTelemetry.Extensions.Hosting 1.20.1 + matching OTLP exporter. Disabled via `OpenTelemetry:Enabled=false` or `OTEL_SDK_DISABLED=true`. Empty endpoint = no exporter.
- Instrumented HTTP, EF Core (default `SetDbQueryParameters` off), Redis (`SetVerboseDatabaseStatements=false`), outbox, Paddle webhook dispositions, and the four existing hosted jobs. Jobs remain in the API process.
- Central `TelemetryRedactor` + activity/log processors. High-cardinality URL/body/email labels stripped. SendGrid/NullEmail never log recipient or raw body.
- `/ready` still exactly `postgres`, `redis`, `default-tenant`.
- Draft PR #503. No merge. Production NO-GO.

### File List

- _bmad-output/implementation-artifacts/46-6-production-observability-instrumentation.md
- _bmad-output/implementation-artifacts/46-6-redaction-coverage-matrix.md
- _bmad-output/implementation-artifacts/46-6-bmad-code-review-d6596101.md
- _bmad-output/implementation-artifacts/46-6-product-acceptance-d6596101.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/deferred-work.md
- src/Api/Api.csproj
- src/Api/Program.cs
- src/Api/appsettings.json
- src/Api/Observability/OpenTelemetryServiceCollectionExtensions.cs
- src/Api/Infrastructure/GlobalExceptionHandler.cs
- src/Api/Controllers/V1/PaddleWebhookController.cs
- src/Api.IntegrationTests/Infrastructure/IntegrationTestWebApplicationFactory.cs
- src/Api.IntegrationTests/Infrastructure/ObservabilityCollectorOutageWebApplicationFactory.cs
- src/Api.IntegrationTests/ObservabilityCollectorOutageIntegrationTests.cs
- src/Infrastructure/Infrastructure.csproj
- src/Infrastructure/Observability/ObservabilityOptions.cs
- src/Infrastructure/Observability/CohestraTelemetry.cs
- src/Infrastructure/Observability/CohestraTraceSampler.cs
- src/Infrastructure/Observability/TelemetryRedactor.cs
- src/Infrastructure/Observability/TelemetryRedactingActivityProcessor.cs
- src/Infrastructure/Observability/TelemetryRedactingLogProcessor.cs
- src/Infrastructure/Email/SendGridEmailSender.cs
- src/Infrastructure/Email/NullEmailSender.cs
- src/Infrastructure/Outbox/OutboxDispatcherHostedService.cs
- src/Infrastructure/Outbox/OutboxProcessor.cs
- src/Infrastructure/Billing/BillingJobsHostedService.cs
- src/Infrastructure/Activities/ActivityExpirationHostedService.cs
- src/Infrastructure/Clients/FollowUpDigestHostedService.cs
- src/Infrastructure.Tests/Infrastructure.Tests.csproj
- src/Infrastructure.Tests/Observability/TelemetryRedactorTests.cs
- src/Infrastructure.Tests/Observability/TelemetryRedactingProcessorTests.cs
- src/Infrastructure.Tests/Observability/CohestraTraceSamplerTests.cs
- src/Infrastructure.Tests/Observability/ObservabilityOptionsTests.cs
- src/Infrastructure.Tests/Observability/CohestraTelemetryInstrumentationTests.cs
- src/Infrastructure.Tests/Observability/SendGridEmailSenderLoggingTests.cs
- src/Infrastructure.Tests/Observability/SyntheticOtlpExportTests.cs
- src/Infrastructure.Tests/Observability/OpenTelemetryRegistrationTests.cs
- src/Infrastructure.Tests/Observability/ListLogger.cs
- src/Infrastructure.Tests/Observability/FakeHostEnvironment.cs

### Change Log

- 2026-10-24: Implemented Story 46.6 OTel SDK, redaction, SendGrid leak fix, and exact-HEAD tests. Status → review.
- 2026-10-24: Review-loop patches — parent-aware sampler so always-on children of unsampled parents export; `RecordException=false` + drop PII `LogRecord.Exception`; Paddle span wraps `ProcessAsync`; outbox idle delay outside `job.run`; allowlisted outbox message types; paddle event types canonicalized; OTel redaction no longer inherits the health 200-char cap.
- 2026-10-24: Second review pass — SendGrid exception object no longer logged; paddle ProcessAsync failures record Failed/Canceled; residue check covers phones/tokens; untrusted remote `traceparent` cannot force 100% traces; outbox status + paddle disposition allowlisted; `OTEL_SDK_DISABLED` trims/`bool.TryParse`.
- 2026-10-24: Second Grok 4.6 Acceptance Auditor PASS on `d6596101`. Product acceptance written. Draft PR #503. No merge. Production NO-GO.
