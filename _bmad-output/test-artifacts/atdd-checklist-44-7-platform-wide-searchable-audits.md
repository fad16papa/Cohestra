# ATDD checklist — Story 44.7 Platform-wide Searchable Audits

Workflow: bmad-testarch-atdd (Murat / TEA)
Date: 2026-10-10
Model: Cursor Grok 4.6

| ID | Acceptance | Automated evidence |
|---|---|---|
| P0-17 | CSV cap 5000 → 400; tenant JWT 403 | integration + TenantIsolation |
| P1-08 | action, tenantId, actorEmail, from, to | unit + integration |
| P1-01 | 1440 / 390 Audits | Playwright |
| P1-12 | skip + one h1 + Audits aria-current | Playwright |
| DetailsJson | sentinel absent JSON + CSV | integration |
| Formula | = + - @ sanitized in CSV | unit + integration |
| from>to / invalid action | 400 not empty | integration |
| Filter parity | list and export share normalizer | unit + integration |
| Recent audit | tenant detail unchanged | frontend + Playwright |

Red before green: isolation + DetailsJson + CSV cap tests written with the implementation.
