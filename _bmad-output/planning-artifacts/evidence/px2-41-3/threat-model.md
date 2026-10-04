# Story 41.3 threat model

Baseline: `ac5538e1`  
Role: Security reviewer  
Model: Grok 4.6

## Assets

Campaign subjects/bodies, recipient emails and names, consent flags, templates, uploaded assets, QR registration URLs, operator email used for test send, provider credentials (server-only).

## Threats and controls

| Threat | Control | Proof |
| --- | --- | --- |
| Cross-tenant list/detail | Tenant host + EF tenant filter; 404 on foreign id | Playwright + existing isolation posture |
| Segment preview leaks other tenant clients | Same tenant scope on `ClientSegmentService` | Preview intercept/denial + no foreign ids |
| Templates/assets cross-tenant | Existing tenant-scoped endpoints | Unchanged services |
| Additional recipients forged | Server validation, max 50, consent/email rules | Existing send validation |
| Consent bypass | Server skip without consent; compose `consentOnly: true` | `CampaignConsentIntegrationTests` |
| Campaign id confused across tenants | GetById tenant-scoped | 404, not 200 |
| Frontend hide as auth | `RequireProPlan` + TenantOperator remain | 39.3 API `plan_locked`; 41.3 403 denied |
| Provider secrets in logs/UI | Do not log keys, bodies, or recipient emails | Code review + no new logging |
| Preview/detail XSS | Client sanitizer + server Ganss.Xss | Unit tests strip script/onerror/`javascript:` |
| Unsafe image/link | Only campaign-asset http(s) images; http/https/mailto links | Processor tests + client sanitizer |
| Real mail in QA | Intercept send and send-test | Playwright asserts those routes are stubbed |
| Duplicate send | Disable and ignore while `sending` | Unit + Playwright |
| Member checkout | UpgradePanel `isTenantAdmin === false` | 39.3 + 41.3 member test |
| Unknown plan SKU | pending, no `requiredPlan` checkout | entitlement unit + Playwright |

## Fail-closed HTML

Strip `script`, `style`, `iframe`, event handlers, `javascript:`, `data:`, `vbscript:`, protocol-relative tricks, and images whose `src` is not a public campaign-asset URL. Unknown tags are dropped, not escaped into executable markup.

## Out of scope / unchanged

Paddle checkout implementation, SendGrid key storage, outbox worker semantics, public registration renderer.
