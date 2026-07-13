using Cohestra.Contracts.Dashboard;

namespace Cohestra.Application.Dashboard;

public interface IDashboardService
{
    Task<DashboardMetricsResponse> GetMetricsAsync(CancellationToken cancellationToken = default);
}
