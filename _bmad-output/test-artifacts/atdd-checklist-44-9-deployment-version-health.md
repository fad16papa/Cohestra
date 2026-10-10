# ATDD checklist — Story 44.9 Deployment Version Health

Workflow: bmad-testarch-atdd (Murat / TEA)
Date: 2026-10-10
Model: Cursor Grok 4.6

| ID | Acceptance | Automated evidence |
|---|---|---|
| FR-44-15 | version readout with provenance | unit + integration + UI |
| AD-19 | SHA staff-only | public system/info sentinel + /ready |
| P0-18 | no Incident; public info unchanged | architecture + HTTP JSON |
| P1-11 | missing SHA → missing_instrumentation | unit + UI + Playwright |
| P1-12 | skip/main/h1 | Playwright 1440/390 |
| Authz | 200/403/403/401 | TenantAuthz + version integration |
| Deploy | SHA after reset; compose ${GIT_SHA:-} | validate-uat-isolation + source test |

Red before green: missing SHA, public sentinel, authz written with implementation.
