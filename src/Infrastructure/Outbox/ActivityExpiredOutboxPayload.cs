namespace Cohestra.Infrastructure.Outbox;

public sealed record ActivityExpiredOutboxPayload(
    Guid ActivityId,
    string ActivityName,
    string Schedule,
    string AdminEmail,
    string TenantName,
    DateTimeOffset ArchivedAtUtc);
