# Story 40.4 model assignments

| Step | Workflow / agent | Model | Work |
| --- | --- | --- | --- |
| Catalog | `bmad-help` | Grok 4.6 | Confirmed BMAD 6.9.0 installed names. Mandatory Code Review Loop in force. `bmad-close-story` is not installed. |
| Create story | `bmad-create-story` / Story Author | Grok 4.6 | `_bmad-output/implementation-artifacts/40-4-activities-and-opportunities-as-category.md` |
| Readiness | `bmad-check-implementation-readiness` / Product Manager | Grok 4.6 | READY evidence in `px2-40-4/readiness.md` |
| Architecture + UX | Architect + UX | Grok 4.6 | `architecture.md`, API/paging, Opportunity boundary, role matrix |
| Implementation | `bmad-dev-story` / Amelia | Grok 4.6 | Server sort, list/detail/archive presentation, tests |
| Composer 2.5 | — | Unused | No bounded presentational handoff required after contracts locked |
| PO correction | PostgreSQL list-order integration proof | Grok 4.6 | `ActivityListOrderingIntegrationTests` on PR #373. Composer 2.5 unused. |

Auto mode: disabled.
