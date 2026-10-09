using Cohestra.Contracts.Platform;

namespace Cohestra.Application.Platform;

public interface IPlatformOpsPaddleService
{
    PlatformOpsPaddleConfigResponse GetConfig();

    Task<PlatformOpsPaddleDeliveryQueryResult> ListDeliveriesAsync(
        PlatformOpsPaddleDeliveryListQuery query,
        CancellationToken cancellationToken = default);
}
