using Cohestra.Domain.Tenants;

namespace Cohestra.Domain.Campaigns;

public class CampaignAsset : ITenantScoped
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }

    public string FileName { get; set; } = string.Empty;

    public string ContentType { get; set; } = string.Empty;

    public string RelativePath { get; set; } = string.Empty;

    public long SizeBytes { get; set; }

    public string? AltText { get; set; }

    public Guid? ActivityId { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
