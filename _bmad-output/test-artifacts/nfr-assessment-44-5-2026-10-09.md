# NFR evidence — Story 44.5

Date: 2026-10-09
Evaluator: Murat / TEA (Grok 4.6)
Overall: PASS for story scope. Not production-ready (NFR-44-10).

| NFR | Verdict | Evidence |
| --- | ------- | -------- |
| NFR-44-1 Secret safety | PASS | Shared sanitizer extended for WebhookSecret/ClientToken/Paddle-Signature values. Config parser rejects secret fields. Invalid signature row omits body and HMAC. |
| NFR-44-2 DTO minimization | PASS | Delivery allow-list: id, eventId, eventType, disposition, tenantId, httpStatus, detailSanitized, observedAt. Config: isConfigured, environment, allowLive, apiHost. No price IDs. |
| NFR-44-3 Retention | PASS | Rejected ≤14 days + rejected cap 10,000 FIFO; others ≤90 days; global cap 50,000 FIFO. Ledger table never pruned. |
| NFR-44-4 Pagination | PASS | Default 25, max 50, filters before Skip/Take. |
| NFR-44-5 Accessibility | PASS | One main, one h1, skip link, Operations aria-current, textual disposition (not color-only), 1440/390 no page overflow, no serious/critical Axe. |
| NFR-44-9 Isolation | PASS | TenantIsolation deliveries filter; TenantAdmin/TenantMember 403; anonymous 401. |
| NFR-44-10 CI ≠ production GO | PASS | Draft PR only. DigitalOcean missing host remains Epic 19. |
| Billing semantic preservation | PASS | No BillingStatus/plan/refund/chargeback/credential-guard changes. |
| Read-only operator surface | PASS | No replay/retry/mark-paid UI or routes. |
| Epic 19 separation | PASS | No deploy/preflight changes. |

Residual: GitHub CI on exact HEAD is the merge gate. DigitalOcean Deploy remains Epic 19.
