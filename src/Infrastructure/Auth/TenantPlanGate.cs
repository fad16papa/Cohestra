using Cohestra.Application.Tenants;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Auth;

public sealed class TenantPlanGate(CohestraDbContext dbContext) : ITenantPlanGate
{
    public async Task<TenantPlanGateResult> EvaluateCampaignsAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var plan = await dbContext.Tenants
            .AsNoTracking()
            .Where(t => t.Id == tenantId)
            .Select(t => (TenantPlan?)t.Plan)
            .FirstOrDefaultAsync(cancellationToken);

        if (plan is null)
        {
            return TenantPlanGateResult.Locked("Tenant not found for plan gate.");
        }

        if (plan is TenantPlan.Pro or TenantPlan.Enterprise)
        {
            return TenantPlanGateResult.Ok();
        }

        return TenantPlanGateResult.Locked("Campaigns require a Pro plan or higher.");
    }
}
