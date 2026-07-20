using Cohestra.Domain.Tenants;

namespace Cohestra.Domain.Campaigns;

public class EmailTemplate : ITenantScoped
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Subject { get; set; } = string.Empty;

    public string Body { get; set; } = string.Empty;

    public CampaignBodyFormat BodyFormat { get; set; } = CampaignBodyFormat.Plain;

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
