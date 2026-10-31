---
story: 46.6
title: Product acceptance — production observability instrumentation
head: d65961010a7cb56901960955dc2ddb5ac999f8f2
accepted: 2026-10-24
production: NO-GO
ux_visual: not-applicable
---

# Story 46.6 product acceptance

HEAD `d65961010a7cb56901960955dc2ddb5ac999f8f2`. No UI surfaces. UX/visual N/A.

## Product / data / integration / regression

| Check | Result | Evidence |
| --- | --- | --- |
| AC1 OTel 1.20.x OTLP + HTTP/EF/Redis/outbox/Paddle/jobs | PASS | Packages 1.20.1 (+ contrib beta.1). Custom spans `outbox.dispatch`, `paddle.webhook`, `job.run`. |
| AC1 `/ready` frozen | PASS | Still `postgres`, `redis`, `default-tenant` only. Outage integration asserts exact names and count 3. |
| AC2 deny-list redaction | PASS | Matrix + `TelemetryRedactorTests` / processors / synthetic OTLP. |
| AC2 SendGrid never logs recipient or raw body | PASS | Status code or exception type name only, all environments. |
| AC3 collector outage does not crash API | PASS | Host with `http://127.0.0.1:1` serves `/health` and `/ready`. ForceFlush does not throw. |
| AC4 disable flags | PASS | `OpenTelemetry:Enabled=false`, `OTEL_SDK_DISABLED=true` (trimmed), empty endpoint. |
| AC5 AD-4 jobs in API | PASS | Four hosted services still in the API process. |
| AC5 no 46.7 dashboards / 46.4 compose / 46.9 audit | PASS | Diff does not touch those files. |
| AC5 no unbounded metric labels | PASS | Allowlisted outbox/paddle labels; HTTP duration view restricted. |
| TenantIsolation | PASS | 9 unit + 39 API (in 217 Integration). |
| API integration / UAT regression | PASS | 217/217 Integration on a fresh `cohestra_test`. UAT compose/workflows untouched. |
| Production | NO-GO | No SSH, no Production compose up, no deploy dispatch, no live providers, no merge. |

## Exact-HEAD tests

- Unit `Category!=Integration`: **1321 passed**
- TenantIsolation unit: **9 passed**
- API Integration: **217 passed / 0 skipped**

## Owner actions

- Review draft PR https://github.com/fad16papa/Cohestra/pull/503
- Do not merge. Do not dispatch Production. Production remains **NO-GO**.
- Story 46.7 owns dashboards. Story 46.4 owns runtime/secrets/Compose. Story 46.9 owns the remaining console-log audit.
