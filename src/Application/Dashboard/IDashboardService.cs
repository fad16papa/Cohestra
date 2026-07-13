using LeadGenerationCrm.Contracts.Dashboard;

namespace LeadGenerationCrm.Application.Dashboard;

public interface IDashboardService
{
    Task<DashboardMetricsResponse> GetMetricsAsync(CancellationToken cancellationToken = default);
}
