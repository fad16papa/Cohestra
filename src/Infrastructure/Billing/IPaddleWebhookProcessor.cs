namespace Cohestra.Infrastructure.Billing;

public interface IPaddleWebhookProcessor
{
    Task<PaddleWebhookProcessResult> ProcessAsync(
        string rawJson,
        CancellationToken cancellationToken = default);
}

public enum PaddleWebhookDisposition
{
    Processed = 0,
    Duplicate = 1,
    Ignored = 2,
    Invalid = 3,
    Retryable = 4,
}

public sealed record PaddleWebhookProcessResult(
    bool Processed,
    bool Duplicate,
    string Detail,
    PaddleWebhookDisposition Disposition)
{
    public static PaddleWebhookProcessResult ProcessedOk(string detail = "Processed.") =>
        new(true, false, detail, PaddleWebhookDisposition.Processed);

    public static PaddleWebhookProcessResult DuplicateEvent(string detail = "Duplicate event.") =>
        new(false, true, detail, PaddleWebhookDisposition.Duplicate);

    public static PaddleWebhookProcessResult Ignored(string detail) =>
        new(false, false, detail, PaddleWebhookDisposition.Ignored);

    public static PaddleWebhookProcessResult Invalid(string detail) =>
        new(false, false, detail, PaddleWebhookDisposition.Invalid);

    public static PaddleWebhookProcessResult Retry(string detail) =>
        new(false, false, detail, PaddleWebhookDisposition.Retryable);
}
