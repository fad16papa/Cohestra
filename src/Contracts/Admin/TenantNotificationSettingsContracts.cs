namespace Cohestra.Contracts.Admin;

public sealed record UpdateTenantNotificationSettingsRequest(bool EmailOnNewRegistration);

public sealed record TenantNotificationSettingsResponse(
    bool EmailOnNewRegistration,
    string? AdminContactEmail);
