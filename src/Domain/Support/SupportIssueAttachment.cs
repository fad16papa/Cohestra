namespace Cohestra.Domain.Support;

public sealed class SupportIssueAttachment
{
    public Guid Id { get; set; }

    public Guid SupportIssueId { get; set; }

    public SupportIssue SupportIssue { get; set; } = null!;

    public string FileName { get; set; } = string.Empty;

    public string ContentType { get; set; } = string.Empty;

    public long SizeBytes { get; set; }

    public string RelativePath { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }
}
