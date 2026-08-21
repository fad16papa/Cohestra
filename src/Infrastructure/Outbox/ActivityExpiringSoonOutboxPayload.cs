namespace Cohestra.Infrastructure.Outbox;

public sealed record ActivityExpiringSoonOutboxPayload(
    Guid ActivityId,
    string ActivityName,
    string Schedule,
    string RecipientEmail,
    string TenantName,
    DateTimeOffset EventEndsAtUtc,
    string RegistrationTimeZoneId,
    int HoursBeforeEnd);
