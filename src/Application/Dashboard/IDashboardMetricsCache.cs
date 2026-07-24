using Cohestra.Contracts.Dashboard;

namespace Cohestra.Application.Dashboard;

public interface IDashboardMetricsCache
{
    Task<DashboardMetricsResponse?> GetAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default);

    Task SetAsync(
        Guid tenantId,
        DashboardMetricsResponse metrics,
        CancellationToken cancellationToken = default);
}
