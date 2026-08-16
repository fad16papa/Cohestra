namespace Cohestra.Infrastructure.Support;

public sealed class SupportSettings
{
    public const string SectionName = "Support";

    public string RecipientEmail { get; set; } = "techsolutions@creativorare.com";

    public string AttachmentStoragePath { get; set; } = "data/support-attachments";

    public int MaxFiles { get; set; } = 3;

    public long MaxFileBytes { get; set; } = 2 * 1024 * 1024;
}

public sealed class SupportSubmissionRateLimitOptions
{
    public const string SectionName = "SupportSubmissionRateLimit";

    public int WindowSeconds { get; set; } = 3600;

    public int MaxSubmissions { get; set; } = 5;
}
