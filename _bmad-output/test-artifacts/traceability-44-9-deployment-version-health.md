# Traceability — Story 44.9 Deployment Version Health

Workflow: bmad-testarch-trace (Murat / TEA)
Date: 2026-10-10
Model: Cursor Grok 4.6
HEAD: Story 44.9 implementation branch
Gate: PASS

| Requirement | Source | Contract | Service | Controller | Deploy | Compose | Frontend | Tests |
|---|---|---|---|---|---|---|---|---|
| FR-44-15 version readout | Story 44.9 | PlatformOpsVersionResponse | PlatformOpsVersionService | GET ops/version | remote-deploy GIT_SHA | ${GIT_SHA:-} | platform-api + Version section | unit/integration/UI/Playwright |
| AD-19 staff-only SHA | AD-19 | ops/version only | — | PlatformAdminOnly | — | API env only | platform-api private | public sentinel + authz |
| GIT_SHA source | GIT_SHA env | PlatformKpi.source | ReadGitSha | GetVersion | rev-parse HEAD | compose subst | parsePlatformOpsVersion | unit + integration + deploy contract |
| environment source | IHostEnvironment | PlatformKpi | EnvironmentName | GetVersion | — | ASPNETCORE_ENVIRONMENT | parser | unit + live |
| apiVersion source | SystemInfo v1 | PlatformKpi | ApiContractVersion | GetVersion | — | — | parser requires v1 | unit + integration |
| Provenance/freshness | PlatformKpiFreshness | actual/missing/unavailable/stale | service mapping | envelope | — | — | parseFreshness | unit + UI |
| PlatformAdmin 200 | PlatformAdminOnly | 200 | — | controller policy | — | — | authFetch | integration + live |
| TenantAdmin 403 | policy | 403 | — | controller | — | — | denial | integration + live |
| TenantMember 403 | policy | 403 | — | controller | — | — | denial | integration + TenantAuthz |
| Anonymous 401 | JWT | 401 | — | controller | — | — | — | integration + live |
| P0-18 public info freeze | SystemController | {Name, ApiVersion} | unchanged | SystemController | — | — | — | HTTP JSON sentinel |
| /ready freeze | MapHealthChecks | status+checks | — | Program.cs | — | — | — | integration + live |
| P1-11 missing SHA | missing_instrumentation | null value | blank/unset | — | no fake SHA | empty subst | Missing instrumentation | unit + UI + Playwright |
| P1-12 a11y shell | 43.4 | one main/h1/skip | — | — | — | — | Overview + Ops | Playwright 1440/390 |
| Overview UI | AC | additive | — | — | — | — | PlatformOpsVersionSection | Playwright + source |
| Operations UI | AC | additive | — | — | — | — | after Outbox | Playwright + source |
| actual state | valid hex | actual | service | 200 | injected SHA | passed | short+full SHA | unit/int/UI |
| missing state | unset | missing_instrumentation | service | 200 | — | empty | Missing instrumentation | unit/int/UI |
| error state | fetch fail | — | — | 503/network | — | — | Version data unavailable | Playwright |
| remote-deploy injection | after reset | export GIT_SHA | — | — | remote-deploy.sh | — | source test | validate-uat-isolation |
| compose propagation | ${GIT_SHA:-} | API env | — | — | — | docker-compose.uat.yml | source test | isolation 51/51 |
| no mutation | GET only | 405 POST | — | HttpGet | no deploy exec | isolation unchanged | no Rollback/SSH | integration + Playwright |

Orphan ACs: none
