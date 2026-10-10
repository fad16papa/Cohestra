# Traceability — Story 44.8

Workflow: bmad-testarch-trace
Model: Cursor Grok 4.6

| Requirement | Domain | Migration | API | UI | Tests |
|---|---|---|---|---|---|
| FR-44-14 Severity enum + filter/set | SupportIssueSeverity | AddSupportIssueSeverity | List/PATCH | Inbox + triage | parser + service + integration + Playwright |
| FR-44-16 audit | PlatformAuditAction.SupportIssueSeverityChanged | — | UpdateAsync + 44.7 allow-list | Audits select | unit + integration |
| P0-18 no Incident | architecture test | no incident table | — | — | SupportIssueSeverityArchitectureTests |
| P1-09 PATCH + audit | — | — | UpdateAsync | detail save | service + integration + isolation |
| P1-10 43.4 | — | — | — | additive UI | platform-admin-43-4.spec.ts |
| Tenant default Unspecified | entity default | backfill Unspecified | CreateAsync unchanged | no tenant selector | integration |
| Numeric/unknown 400 | parser | — | List + PATCH | strict client parse | parser + integration |
| 390/1440/a11y | — | — | — | native selects + text | platform-ops-44-8.spec.ts |

Orphan AC: none.
