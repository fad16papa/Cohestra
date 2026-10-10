# NFR audit — Story 44.9 Deployment Version Health

Workflow: bmad-testarch-nfr (Murat / TEA)
Date: 2026-10-10
Model: Cursor Grok 4.6
Gate: PASS

| NFR | Evidence | Result |
|---|---|---|
| Staff-only metadata | PlatformAdminOnly; TenantAdmin/Member 403; anonymous 401 | PASS |
| No secret expansion | Version DTO has gitSha/environmentName/apiVersion only; JSON asserts omit SigningKey/Password/ApiKey | PASS |
| Truthful provenance | Existing PlatformKpi vocabulary; no second dialect | PASS |
| Missing instrumentation | Blank/unset → missing_instrumentation; UI text not color-only | PASS |
| Deployment reproducibility | SHA derived from HEAD after reset; compose substitution; no hardcoded SHA | PASS |
| UAT isolation preservation | validate-uat-isolation 51/51; ports/project/edge unchanged | PASS |
| Responsive accessibility | Playwright 1440/390; skip/main/h1; Axe no serious/critical after dl fix | PASS |
| Read-only behavior | GET only; POST 405; no Rollback/Redeploy/SSH | PASS |
| No public fingerprint widening | /system/info and /ready unchanged | PASS |
| Epic 19 separation | No SSH/deploy/host change; DigitalOcean missing host remains Epic 19 | PASS |
| CI != deployment readiness | Draft PR only; Deploy job failure is not an acceptance gate | PASS |

Security findings: none that expand secrets, SHA, or host fingerprint to public surfaces.
