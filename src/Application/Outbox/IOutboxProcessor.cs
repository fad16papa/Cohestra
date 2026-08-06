namespace Cohestra.Application.Outbox;

public interface IOutboxProcessor
{
    /// <summary>Claims and processes up to one batch of pending outbox messages.</summary>
    Task<int> ProcessBatchAsync(CancellationToken cancellationToken = default);
}
