using Cohestra.Contracts.Admin;

namespace Cohestra.Application.Tenants;

public interface ITenantShellService
{
    Task<TenantShellResponse> GetShellAsync(
        Guid tenantId,
        bool isTenantAdmin,
        CancellationToken cancellationToken = default);
}
