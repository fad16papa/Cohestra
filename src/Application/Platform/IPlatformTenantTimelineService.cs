using Cohestra.Application.Tenants;
using Cohestra.Contracts.Platform;

namespace Cohestra.Application.Platform;

public interface IPlatformTenantTimelineService
{
    Task<PlatformTenantResult<PlatformTenantTimelineResponse>> GetAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default);
}
