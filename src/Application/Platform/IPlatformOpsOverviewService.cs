using Cohestra.Contracts.Platform;

namespace Cohestra.Application.Platform;

public interface IPlatformOpsOverviewService
{
    Task<PlatformOpsOverviewResponse> GetAsync(bool hideLoadTest, CancellationToken cancellationToken = default);
}
