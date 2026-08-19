namespace Cohestra.Domain.Support;

public sealed class SupportIssueReply
{
    public Guid Id { get; set; }

    public Guid SupportIssueId { get; set; }

    public Guid ActorUserId { get; set; }

    public string? ActorEmail { get; set; }

    public string Body { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }

    public SupportIssue SupportIssue { get; set; } = null!;
}
