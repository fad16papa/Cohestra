using Cohestra.Contracts.Platform;

namespace Cohestra.Application.Platform;

public interface IPlatformOpsOutboxService
{
    Task<PlatformOpsOutboxSummaryResponse> GetSummaryAsync(CancellationToken cancellationToken = default);

    Task<PlatformOpsOutboxQueryResult> ListAsync(
        PlatformOpsOutboxListQuery query,
        CancellationToken cancellationToken = default);
}
