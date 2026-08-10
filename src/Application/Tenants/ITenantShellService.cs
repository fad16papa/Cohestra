using Cohestra.Contracts.Admin;

namespace Cohestra.Application.Tenants;

public interface ITenantShellService
{
    Task<TenantShellResponse> GetShellAsync(
        Guid tenantId,
        bool isTenantAdmin,
        string? operatorEmail = null,
        CancellationToken cancellationToken = default);
}
