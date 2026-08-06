namespace Cohestra.Infrastructure.Outbox;

public sealed class OutboxOptions
{
    public const string SectionName = "Outbox";

    public bool Enabled { get; set; } = true;

    public int PollIntervalSeconds { get; set; } = 5;

    public int BatchSize { get; set; } = 20;

    public int MaxAttempts { get; set; } = 5;

    public int BaseRetryDelaySeconds { get; set; } = 30;

    public int ProcessingTimeoutSeconds { get; set; } = 300;
}
