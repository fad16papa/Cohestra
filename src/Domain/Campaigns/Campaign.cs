using Cohestra.Domain.Tenants;

namespace Cohestra.Domain.Campaigns;

public enum CampaignStatus
{
    Completed,
    Failed,
}

public class Campaign : ITenantScoped
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }

    public string Subject { get; set; } = string.Empty;

    public string Body { get; set; } = string.Empty;

    public CampaignBodyFormat BodyFormat { get; set; } = CampaignBodyFormat.Plain;

    public Guid? EmailTemplateId { get; set; }

    public EmailTemplate? EmailTemplate { get; set; }

    public CampaignStatus Status { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset SentAt { get; set; }

    public int SentCount { get; set; }

    public int FailedCount { get; set; }

    public int SkippedCount { get; set; }

    public ICollection<CampaignRecipient> Recipients { get; set; } = [];
}
