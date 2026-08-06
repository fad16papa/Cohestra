namespace Cohestra.Application.Outbox;

public interface IOutboxPublisher
{
    /// <summary>
    /// Stages an outbox message in the current DbContext unit of work.
    /// Call before <c>SaveChanges</c>. Duplicate <paramref name="dedupeKey"/> values are ignored.
    /// </summary>
    void Enqueue(
        Guid tenantId,
        string messageType,
        string payloadJson,
        string? dedupeKey = null,
        DateTimeOffset? nextAttemptAt = null);
}
