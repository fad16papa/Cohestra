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

    Task<TenantNotificationSettingsResponse> GetNotificationSettingsAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default);

    Task<TenantNotificationSettingsResponse> UpdateNotificationSettingsAsync(
        Guid tenantId,
        bool emailOnNewRegistration,
        CancellationToken cancellationToken = default);

    Task<TenantEmbedSettingsResponse> GetEmbedSettingsAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default);

    Task<(bool Ok, string? Error)> UpdateEmbedSettingsAsync(
        Guid tenantId,
        IReadOnlyList<string> allowedEmbedOrigins,
        CancellationToken cancellationToken = default);
}
