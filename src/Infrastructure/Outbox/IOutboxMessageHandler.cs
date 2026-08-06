using Cohestra.Domain.Outbox;

namespace Cohestra.Infrastructure.Outbox;

public interface IOutboxMessageHandler
{
    string MessageType { get; }

    Task HandleAsync(
        OutboxMessage message,
        CancellationToken cancellationToken = default);
}
