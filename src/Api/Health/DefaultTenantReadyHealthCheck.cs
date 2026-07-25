using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Cohestra.Api.Health;

/// <summary>
/// Ready-tagged check: Platform 0 default tenant row must exist (Story 11.2 seed).
/// Fail-closed (Unhealthy) when missing so ops notice a broken migration/seed.
/// Mapped on anonymous GET /ready — no Platform Admin JWT required.
/// </summary>
public sealed class DefaultTenantReadyHealthCheck(IServiceScopeFactory scopeFactory) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();

        var exists = await db.Tenants.AsNoTracking()
            .AnyAsync(t => t.Id == TenantIds.Default, cancellationToken);

        return exists
            ? HealthCheckResult.Healthy("Default tenant (Platform 0) is present.")
            : HealthCheckResult.Unhealthy(
                "Default tenant row is missing (TenantIds.Default / slug 'default').");
    }
}
