# ATDD checklist — Story 44.8 Support Severity

Workflow: bmad-testarch-atdd (Murat / TEA)
Date: 2026-10-10
Model: Cursor Grok 4.6

| ID | Acceptance | Automated evidence |
|---|---|---|
| P0-18 | No Incident type | source/architecture assertion |
| P1-09 | PATCH severity + audit row | unit + integration |
| P1-10 | 43.4 support E2E remains | Playwright `platform-admin-43-4` + 44.8 spec |
| Default | legacy/tenant create → Unspecified | unit + integration |
| Filter | name-only; numeric/unknown 400 | unit + integration |
| Unchanged | same severity → no audit | unit + integration |
| Email | severity-only does not enqueue filer status | unit |
| Isolation | A changes; B unchanged; audit TenantId=A | TenantIsolation |
| 44.7 | SupportIssueSeverityChanged searchable | unit + UI allow-list |
| A11y | text not color-only; 1440/390 | Playwright |

Red before green: isolation + PATCH audit + numeric 400 written with the implementation.
