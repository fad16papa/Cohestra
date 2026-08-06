using Cohestra.Domain.Tenants;

namespace Cohestra.Domain.Campaigns;

public enum CampaignRecipientStatus
{
    Sent,
    Failed,
    Skipped,
}

public class CampaignRecipient : ITenantScoped
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }

    public Guid CampaignId { get; set; }

    public Campaign Campaign { get; set; } = null!;

    public Guid ClientId { get; set; }

    public Clients.Client Client { get; set; } = null!;

    public string? Email { get; set; }

    public CampaignRecipientStatus Status { get; set; }

    public string? FailureReason { get; set; }

    public string? ProviderMessageId { get; set; }
}
