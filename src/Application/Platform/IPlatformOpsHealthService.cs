using Cohestra.Contracts.Platform;

namespace Cohestra.Application.Platform;

public interface IPlatformOpsHealthService
{
    Task<PlatformOpsHealthResponse> GetAsync(CancellationToken cancellationToken = default);
}
