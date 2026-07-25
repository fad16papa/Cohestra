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

        if (tenant.IsComplimentary
            || evaluation.AdminAccess is TenantAccessMode.Blocked
            || evaluation.AdminAccess is TenantAccessMode.ReadOnly)
        {
            return evaluation;
        }

        if (IsOverPlanLimits(tenant.Plan, await GetUsageAsync(tenantId, cancellationToken)))
        {
            return new TenantAccessEvaluation(
                AdminAccess: TenantAccessMode.ReadOnly,
                PublicRegistrationAllowed: false,
                PublicSurface: evaluation.PublicSurface,
                ShowSettleBanner: evaluation.ShowSettleBanner);
        }

        return evaluation;
    }

    public async Task<TenantUsageSnapshot> GetUsageAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var monthStart = new DateTimeOffset(
            DateTime.UtcNow.Year,
            DateTime.UtcNow.Month,
            1,
            0,
            0,
            0,
            TimeSpan.Zero);

        var now = DateTimeOffset.UtcNow;

        var activeMembers = await dbContext.TenantMemberships
            .AsNoTracking()
            .CountAsync(m => m.TenantId == tenantId, cancellationToken);

        var pendingInvites = await dbContext.TenantInvites
            .AsNoTracking()
            .CountAsync(
                i => i.TenantId == tenantId
                    && i.RevokedAt == null
                    && i.AcceptedAt == null
                    && i.ExpiresAt > now,
                cancellationToken);

        var communities = await dbContext.Communities
            .AsNoTracking()
            .CountAsync(c => c.TenantId == tenantId, cancellationToken);

        var publishedActivities = await dbContext.Activities
            .AsNoTracking()
            .CountAsync(
                a => a.TenantId == tenantId && a.Status == Domain.Activities.ActivityStatus.Published,
                cancellationToken);

        var registrationsThisMonth = await dbContext.Registrations
            .AsNoTracking()
            .CountAsync(
                r => r.TenantId == tenantId && r.CreatedAt >= monthStart,
                cancellationToken);

        return new TenantUsageSnapshot(
            activeMembers + pendingInvites,
            communities,
            publishedActivities,
            registrationsThisMonth);
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
            || usage.Communities > limits.Communities
            || usage.PublishedActivities > limits.PublishedActivities
            || usage.RegistrationsThisMonth > limits.RegistrationsPerMonth;
    }
}
