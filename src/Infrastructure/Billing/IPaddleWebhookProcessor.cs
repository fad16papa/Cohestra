namespace Cohestra.Infrastructure.Billing;

public interface IPaddleWebhookProcessor
{
    Task<PaddleWebhookProcessResult> ProcessAsync(
        string rawJson,
        CancellationToken cancellationToken = default);
}

public sealed record PaddleWebhookProcessResult(bool Processed, bool Duplicate, string Detail);
