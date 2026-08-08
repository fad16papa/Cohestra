using Cohestra.Contracts.Admin;

namespace Cohestra.Application.Tenants;

public interface ITenantOrganizationService
{
    Task<TenantRegistrationTimeZoneResponse> GetRegistrationTimeZoneAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default);

    Task<(bool Ok, string? Error)> UpdateRegistrationTimeZoneAsync(
        Guid tenantId,
        string registrationTimeZoneId,
        CancellationToken cancellationToken = default);
}
