# NFR evidence — Story 44.4

Date: 2026-10-09
Evaluator: Murat / TEA (Grok 4.6)
Overall: PASS for story scope. Not production-ready (NFR-44-10).

| NFR | Verdict | Evidence |
| --- | ------- | -------- |
| NFR-44-1 Secret safety | PASS | Shared sanitizer redacts credentials, redis URLs, Bearer/ApiKey/Secret, JWT, emails, stack frames before truncate. P0-09 HTTP body omits payload sentinel, MIME, JWT, Password=. |
| NFR-44-2 DTO minimization | PASS | List item allow-list 11 fields. No PayloadJson, DedupeKey, raw LastError. Domain entity is not serialized. |
| NFR-44-4 Pagination | PASS | Default 25, max 50 clamp, filters before Skip/Take, totalCount returned, frontend always requests 25. |
| NFR-44-5 Accessibility | PASS | One main, one h1, skip link, Operations aria-current, textual status, table semantics, empty/error `role=status`/`alert`, keyboard filters, no serious/critical Axe on 1440 failed/empty. |
| NFR-44-9 Isolation | PASS | TenantIsolation P0-10; TenantAdmin 403 on summary/list; PlatformAdmin 200. |
| NFR-44-10 CI ≠ production GO | PASS | Draft PR only. Epic 19 DigitalOcean host gap remains out of scope. This audit is not a production cutover. |
| NFR-44-6 `/ready` freeze | PASS | Not modified in 44.4; 44.3 freeze tests still pass. |
| NFR-44-7 Truth | PASS | Zero Failed is observability copy, not Healthy email; health outbox remains `not_in_probe`. |

Residual: GitHub CI on exact HEAD is the merge gate. DigitalOcean Deploy remains Epic 19.
