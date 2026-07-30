# Api.IntegrationTests

Live-stack integration tests for the Cohestra API using `WebApplicationFactory`.

## Prerequisites

- **PostgreSQL** and **Redis** reachable with the same connection strings as the test factory (CI uses service containers; locally run `docker compose up -d postgres redis` or full stack).
- Migrations applied — the factory runs `EnsureDefaultTenantProPlanAsync` and seeds on startup when the stack is available.

If dependencies are missing, tests call `IntegrationTestHelpers.SkipIfUnavailable` and are **skipped** (not failed).

## Running tests

```bash
# All integration tests
dotnet test src/Api.IntegrationTests

# SM-1 tenant isolation gate (required on PRs to main)
dotnet test src/Api.IntegrationTests --filter "Category=TenantIsolation"
```

CI runs TenantIsolation tests in the integration job; branch protection should require that job green before merge.

## Conventions

- `[Collection(IntegrationTestCollection.Name)]` on test classes
- `[Trait("Category", "Integration")]` on all tests
- `[Trait("Category", "TenantIsolation")]` on SM-1 isolation tests
- `SkippableFact` + `SkipIfUnavailable(factory)` when Postgres/Redis may be absent

## Multi-tenant helpers

| Helper | Use |
|--------|-----|
| `IntegrationTestHelpers.UseTenantHost(client, slug)` | Bind HTTP Host to `{slug}.localhost` for tenant resolution |
| `IntegrationTestHelpers.CreateTenantViaPlatformAsync` | Provision Tenant B via platform admin API |
| `IntegrationTestHelpers.SeedPublishedActivityForTenantAsync` | Seed activity on a specific tenant |
| `IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(services)` | **Canonical Pro bootstrap** — call before tests needing reports, site builder, or campaigns |
| `IntegrationTestHelpers.CreateTenantAdminUserAsync` | Seed TenantAdmin user + membership on a tenant |
| `IntegrationTestHelpers.CreateTenantMemberUserAsync` | Seed TenantMember user + membership on a tenant |
| `IntegrationTestHelpers.MintTenantAccessToken` | Mint tenant-scoped JWT with chosen membership role |

Default tenant (`TenantIds.Default` / slug `default`) migrates as **Basic**. Plan gates block Pro-only admin flows until `EnsureDefaultTenantProPlanAsync` runs (wired in the integration test factory for the default tenant).

## Further reading

- `_bmad-output/project-context.md` — Testing Rules
- `TenantIsolationApiTests.cs` — SM-1 negative-case patterns
- `TenantAuthzIntegrationTests.cs` — Epic 12 membership + platform authz matrix (Story 17.3)
