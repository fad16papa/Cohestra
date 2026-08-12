using Cohestra.Application.Tenants;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tenants;

public sealed class TenantAccessService(CohestraDbContext dbContext) : ITenantAccessService
{
    public async Task<TenantAccessEvaluation> EvaluateAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        if (tenant is null)
        {
            return new TenantAccessEvaluation(
                TenantAccessMode.Blocked,
                PublicRegistrationAllowed: false,
                TenantPublicSurface.NotFound,
                ShowSettleBanner: false);
        }

        var evaluation = TenantAccessEvaluator.Evaluate(tenant);

        if (tenant.IsComplimentary)
        {
            return evaluation;
        }

        if (evaluation.AdminAccess is TenantAccessMode.Blocked)
        {
            return evaluation;
        }

        if (evaluation.AdminAccess is TenantAccessMode.ReadOnly)
        {
            return evaluation with { ReadOnlyReason = TenantReadOnlyReason.BillingOnHold };
        }

        if (IsOverPlanLimits(tenant.Plan, await GetUsageAsync(tenantId, cancellationToken)))
        {
            return new TenantAccessEvaluation(
                AdminAccess: TenantAccessMode.ReadOnly,
                PublicRegistrationAllowed: false,
                PublicSurface: evaluation.PublicSurface,
                ShowSettleBanner: evaluation.ShowSettleBanner,
                ReadOnlyReason: TenantReadOnlyReason.OverPlanLimits);
        }

        return evaluation;
    }

    public async Task<TenantUsageSnapshot> GetUsageAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .Select(t => new { t.Id, t.RegistrationTimeZoneId })
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        if (tenant is null)
        {
            return new TenantUsageSnapshot(0, 0, 0, 0);
        }

        var now = DateTimeOffset.UtcNow;
        var usage = await TenantShellService.ComputeUsageAsync(
            dbContext,
            tenantId,
            tenant.RegistrationTimeZoneId,
            now,
            cancellationToken);

        return new TenantUsageSnapshot(
            usage.SeatsUsed,
            usage.Communities,
            usage.PublishedActivities,
            usage.RegistrationsThisMonth);
    }

    public async Task TouchActivityAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        var tenant = await dbContext.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
        if (tenant is null)
        {
            return;
        }

        tenant.LastActivityAt = DateTimeOffset.UtcNow;
        tenant.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    internal static bool IsOverPlanLimits(TenantPlan plan, TenantUsageSnapshot usage)
    {
        var limits = TenantPlanLimits.For(plan);
        return usage.SeatsUsed > limits.Seats
            || usage.Communities >= limits.Communities
            || usage.PublishedActivities >= limits.PublishedActivities
            || usage.RegistrationsThisMonth >= limits.RegistrationsPerMonth;
    }
}
