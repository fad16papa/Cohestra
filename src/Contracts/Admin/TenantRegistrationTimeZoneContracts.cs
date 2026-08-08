namespace Cohestra.Contracts.Admin;

public sealed record UpdateTenantRegistrationTimeZoneRequest(string RegistrationTimeZoneId);

public sealed record TenantRegistrationTimeZoneResponse(
    string RegistrationTimeZoneId,
    string DisplayLabel,
    DateTimeOffset RegistrationMonthResetsAt,
    IReadOnlyList<RegistrationTimeZoneOption> Options);

public sealed record RegistrationTimeZoneOption(string Id, string Label);
