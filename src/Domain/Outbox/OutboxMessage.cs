namespace Cohestra.Domain.Outbox;

/// <summary>
/// Durable work queue row written in the same transaction as business mutations.
/// Not tenant-filtered — the dispatcher processes all tenants.
/// </summary>
public sealed class OutboxMessage
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }

    public string MessageType { get; set; } = string.Empty;

    public string PayloadJson { get; set; } = string.Empty;

    public string? DedupeKey { get; set; }

    public OutboxMessageStatus Status { get; set; }

    public int AttemptCount { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset NextAttemptAt { get; set; }

    public DateTimeOffset? ProcessedAt { get; set; }

    public string? LastError { get; set; }
}
