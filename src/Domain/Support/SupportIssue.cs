using Cohestra.Domain.Tenants;

namespace Cohestra.Domain.Support;

public sealed class SupportIssue : ITenantScoped
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }

    public string IssueNumber { get; set; } = string.Empty;

    public Guid SubmittedByUserId { get; set; }

    public string Subject { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public SupportIssueStatus Status { get; set; } = SupportIssueStatus.Open;

    public string OperatorEmail { get; set; } = string.Empty;

    public string OperatorDisplayName { get; set; } = string.Empty;

    public string TenantSlug { get; set; } = string.Empty;

    public string TenantName { get; set; } = string.Empty;

    public TenantPlan Plan { get; set; } = TenantPlan.Basic;

    public string? UserAgent { get; set; }

    public string? InternalNote { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<SupportIssueAttachment> Attachments { get; set; } = [];
}
