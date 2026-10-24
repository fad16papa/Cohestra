---
story: 46.6
title: Telemetry redaction coverage matrix
status: in-progress
production: NO-GO
created: 2026-10-24
---

# Story 46.6 redaction coverage matrix

Central implementation: `TelemetryRedactor` + `TelemetryRedactingActivityProcessor` + `TelemetryRedactingLogProcessor`.
Known leak fix: `SendGridEmailSender` / `NullEmailSender` never log recipient email or raw provider body.

| Class | Example | Key/value path | Expected | Test |
| --- | --- | --- | --- | --- |
| Password | `Password=super-secret` | value + `password` key | `[redacted]` / absent | `TelemetryRedactorTests`, sanitizer reuse |
| JWT | `eyJ...aaa.bbb` | value + `authorization` | absent | `TelemetryRedactorTests` |
| Refresh token | `refresh_token=...` | key contains `token` | `[redacted]` | `TelemetryRedactorTests` |
| API key | `ApiKey=SG.live.secret` | value + `api_key` | absent | `TelemetryRedactorTests` |
| Paddle secret | `WebhookSecret=pdl_ntfset_live` | value + `webhook_secret` | absent | `TelemetryRedactorTests` |
| SendGrid secret | `SG.sendgrid.secret` | value | absent | `TelemetryRedactorTests` |
| reCAPTCHA secret | `Secret=recaptcha-secret` | value + `recaptcha_secret` | absent | `TelemetryRedactorTests` |
| DB credentials | `Host=db;Username=crm;Password=s3cret` | value + `connection_string` | absent | `TelemetryRedactorTests` |
| SSH material | `BEGIN OPENSSH PRIVATE KEY` | value + `ssh_key` | absent | `TelemetryRedactorTests` |
| Customer email | `customer@example.com` | value + `email` / `ToEmail` | absent | `TelemetryRedactorTests`, log processor |
| Phone | `+6591234567` | value + `phone` | absent | `TelemetryRedactorTests` |
| Form answers | `{"answers":{"q1":"..."}}` | value + `answers` | absent | `TelemetryRedactorTests` |
| Outbox payload | `PayloadJson` | key + JSON body | `[redacted]` | `TelemetryRedactorTests` |
| SQL literals | `'ada@example.com'` | `db.statement` | `'?'` | `TelemetryRedactorTests` |
| High-cardinality URL | `url.full` / `url.query` / `http.url` | key | `[redacted]` | `TelemetryRedactorTests` |
| SendGrid Production log | recipient / raw body | ILogger | never present | `SendGridEmailSenderLoggingTests` |
| Synthetic OTLP body | webhook secret tag | exported bytes | absent | `SyntheticOtlpExportTests` |

Safe labels kept: `http.route`, `http.request.method`, `http.response.status_code`, `outbox.message_type`, `outbox.status`, `paddle.event_type` (bounded + `other`), `paddle.disposition`, `job.name`, `tenant.id`.
