using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;

namespace Cohestra.Application.Tenants;

public sealed record TenantUsageSnapshot(
    int SeatsUsed,
    int Communities,
    int PublishedActivities,
    int RegistrationsThisMonth);

public interface ITenantAccessService
{
    Task<TenantAccessEvaluation> EvaluateAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default);

    Task<TenantUsageSnapshot> GetUsageAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default);

    Task TouchActivityAsync(Guid tenantId, CancellationToken cancellationToken = default);
}
